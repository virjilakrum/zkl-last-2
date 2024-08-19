import React, { useState, useEffect, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { Program, AnchorProvider } from "@project-serum/anchor";
import { create } from "ipfs-http-client";
import signWithMAC from "./macSigning";
import idl from "./idl.json";

require("@solana/wallet-adapter-react-ui/styles.css");

// IPFS configuration for local node
const ipfs = create({ host: "localhost", port: "5001", protocol: "http" });

const programID = new PublicKey("DAPVX77x4nA6AoqZpMLeYzfaYZCrBkDyoQuatmn6yn1c");
const opts = {
  preflightCommitment: "processed",
};

function AppContent() {
  const wallet = useWallet();
  const [file, setFile] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [signedHash, setSignedHash] = useState("");
  const [program, setProgram] = useState();
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const connection = new Connection(
      "http://localhost:8899",
      opts.preflightCommitment
    );
    const provider = new AnchorProvider(connection, wallet, opts);
    const program = new Program(idl, programID, provider);
    setProgram(program);
  }, [wallet]);

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsUploading(true);
      try {
        const added = await ipfs.add(selectedFile);
        const hash = added.path;
        setFileHash(hash);
        console.log("File uploaded to IPFS with hash:", hash);

        if (wallet.publicKey) {
          const key = wallet.publicKey.toBase58();
          const signed = signWithMAC(hash, key);
          setSignedHash(signed);
          console.log("Signed hash:", signed);
        }
      } catch (error) {
        console.error("Error uploading file to IPFS:", error);
        alert(
          "Error uploading file to IPFS. Make sure your local IPFS node is running."
        );
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRecipientChange = (event) => {
    setRecipient(event.target.value);
  };

  const createUserAccount = async () => {
    if (!program || !wallet.publicKey) return;
    try {
      await program.methods
        .createUserAccount()
        .accounts({
          userAccount: wallet.publicKey,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("User account created");
    } catch (error) {
      console.error("Error creating user account:", error);
    }
  };

  const handleSubmit = async () => {
    if (!fileHash || !signedHash || !recipient || !wallet.publicKey) {
      alert(
        "Please connect your wallet, upload a file, and enter a recipient."
      );
      return;
    }

    try {
      await sendFileHash(fileHash, signedHash);
    } catch (error) {
      console.error("Error sending file hash:", error);
    }
  };

  const sendFileHash = async (hash, signed) => {
    if (!program || !wallet.publicKey || !recipient) return;
    try {
      const recipientPubkey = new PublicKey(recipient);
      await program.methods
        .sendFileHash(hash, signed)
        .accounts({
          sender: wallet.publicKey,
          recipient: recipientPubkey,
        })
        .rpc();
      console.log("File hash sent");
    } catch (error) {
      console.error("Error sending file hash:", error);
    }
  };

  return (
    <div>
      <h1>ZKL-Last-2</h1>
      <WalletMultiButton />
      {wallet.connected && (
        <>
          <button onClick={createUserAccount}>Create User Account</button>
          <input
            type="file"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          {isUploading && <p>Uploading file to IPFS...</p>}
          <input
            type="text"
            placeholder="Recipient's public key"
            value={recipient}
            onChange={handleRecipientChange}
          />
          <button
            onClick={handleSubmit}
            disabled={!fileHash || !signedHash || !recipient}
          >
            Send File Hash
          </button>
          {fileHash && <p>File hash: {fileHash}</p>}
          {signedHash && <p>Signed hash: {signedHash}</p>}
        </>
      )}
    </div>
  );
}

export default function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(() => [new PhantomWalletAdapter()], [network]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AppContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
