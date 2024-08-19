import React, { useState, useEffect, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {
  clusterApiUrl,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Program, AnchorProvider } from "@project-serum/anchor";
import { create } from "ipfs-http-client";
import idl from "./idl.json";

require("@solana/wallet-adapter-react-ui/styles.css");

// IPFS client setup
const ipfs = create({ host: "localhost", port: "5001", protocol: "http" });

// Solana program ID
const programID = new PublicKey("DAPVX77x4nA6AoqZpMLeYzfaYZCrBkDyoQuatmn6yn1c");

function AppContent() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  const [file, setFile] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [encryptedHash, setEncryptedHash] = useState("");
  const [program, setProgram] = useState();
  const [isUploading, setIsUploading] = useState(false);
  const [userAccount, setUserAccount] = useState(null);

  useEffect(() => {
    if (wallet) {
      const provider = new AnchorProvider(connection, wallet, {
        preflightCommitment: "processed",
      });
      const program = new Program(idl, programID, provider);
      setProgram(program);
    }
  }, [wallet, connection]);

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsUploading(true);
      try {
        const buffer = await selectedFile.arrayBuffer();
        const added = await ipfs.add(buffer);
        const hash = added.cid.toString();
        setFileHash(hash);
        console.log("File uploaded to IPFS with hash:", hash);
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
      const [userAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_account"), wallet.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .createUserAccount()
        .accounts({
          userAccount: userAccountPda,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setUserAccount(userAccountPda);
      console.log("User account created:", userAccountPda.toString());
    } catch (error) {
      console.error("Error creating user account:", error);
    }
  };

  const encryptHash = async () => {
    if (!program || !wallet.publicKey || !fileHash) {
      alert("Please upload a file and connect your wallet first.");
      return;
    }
    try {
      const encryptedHash = await program.methods
        .encryptHash(fileHash)
        .accounts({
          sender: wallet.publicKey,
        })
        .rpc();
      setEncryptedHash(encryptedHash);
      console.log("Encrypted hash:", encryptedHash);
    } catch (error) {
      console.error("Error encrypting file hash:", error);
    }
  };

  const sendEncryptedHash = async () => {
    if (
      !program ||
      !wallet.publicKey ||
      !encryptedHash ||
      !recipient ||
      !userAccount
    ) {
      alert(
        "Please encrypt the hash, enter a recipient, and create a user account before sending."
      );
      return;
    }
    try {
      const recipientPubkey = new PublicKey(recipient);
      const [recipientAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_account"), recipientPubkey.toBuffer()],
        program.programId
      );

      await program.methods
        .sendEncryptedHash(encryptedHash)
        .accounts({
          sender: wallet.publicKey,
          recipient: recipientAccountPda,
        })
        .rpc();
      console.log("Encrypted hash sent");
    } catch (error) {
      console.error("Error sending encrypted hash:", error);
    }
  };

  const verifyAndDecryptHash = async () => {
    if (!program || !wallet.publicKey || !encryptedHash || !userAccount) {
      alert(
        "Please receive an encrypted hash and create a user account first."
      );
      return;
    }
    try {
      const decryptedHash = await program.methods
        .verifyAndDecryptHash(encryptedHash)
        .accounts({
          recipient: userAccount,
        })
        .rpc();
      console.log("Decrypted hash:", decryptedHash);
      // Here you would use this hash to fetch the file from IPFS
    } catch (error) {
      console.error("Error verifying and decrypting hash:", error);
    }
  };

  return (
    <div>
      <h1>ZKL-Last-2</h1>
      <WalletMultiButton />
      {wallet && wallet.publicKey && (
        <>
          <button onClick={createUserAccount} disabled={userAccount}>
            {userAccount ? "User Account Created" : "Create User Account"}
          </button>
          <input
            type="file"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          {isUploading && <p>Uploading file to IPFS...</p>}
          {fileHash && <p>File hash: {fileHash}</p>}
          <button onClick={encryptHash} disabled={!fileHash || !userAccount}>
            Encrypt Hash
          </button>
          {encryptedHash && <p>Encrypted hash: {encryptedHash}</p>}
          <input
            type="text"
            placeholder="Recipient's public key"
            value={recipient}
            onChange={handleRecipientChange}
          />
          <button
            onClick={sendEncryptedHash}
            disabled={!encryptedHash || !recipient || !userAccount}
          >
            Send Encrypted Hash
          </button>
          <button
            onClick={verifyAndDecryptHash}
            disabled={!encryptedHash || !userAccount}
          >
            Verify and Decrypt Hash
          </button>
        </>
      )}
    </div>
  );
}

export default function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

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
