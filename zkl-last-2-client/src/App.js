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
import {
  Program,
  AnchorProvider,
  web3,
  utils,
  BN,
} from "@project-serum/anchor";
import { create } from "ipfs-http-client";
import idl from "./idl.json";

require("@solana/wallet-adapter-react-ui/styles.css");

const ipfs = create({ host: "localhost", port: "5001", protocol: "http" });
const programID = new PublicKey("DAPVX77x4nA6AoqZpMLeYzfaYZCrBkDyoQuatmn6yn1c");

function AppContent() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  const [userType, setUserType] = useState(null);
  const [file, setFile] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [encryptedHash, setEncryptedHash] = useState("");
  const [program, setProgram] = useState();
  const [isUploading, setIsUploading] = useState(false);
  const [userAccount, setUserAccount] = useState(null);
  const [receivedEncryptedHash, setReceivedEncryptedHash] = useState("");

  useEffect(() => {
    if (wallet) {
      const provider = new AnchorProvider(connection, wallet, {
        preflightCommitment: "processed",
      });
      const program = new Program(idl, programID, provider);
      setProgram(program);
      checkIfAccountExists();
    }
  }, [wallet, connection]);

  const checkIfAccountExists = async () => {
    if (!program || !wallet) return;
    try {
      const [userAccountPda] = await PublicKey.findProgramAddress(
        [Buffer.from("user_account"), wallet.publicKey.toBuffer()],
        program.programId
      );
      const account = await program.account.userAccount.fetch(userAccountPda);
      setUserAccount(userAccountPda);
      console.log("User account exists:", userAccountPda.toString());
    } catch (error) {
      console.log("User account does not exist yet");
    }
  };

  const createUserAccount = async () => {
    if (!program || !wallet) return;
    try {
      const [userAccountPda] = await PublicKey.findProgramAddress(
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

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsUploading(true);
      try {
        const buffer = await selectedFile.arrayBuffer();
        const added = await ipfs.add(buffer);
        const hash = added.path;
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

  const encryptHash = async () => {
    if (!program || !wallet || !fileHash) {
      alert("Please upload a file and connect your wallet first.");
      return;
    }
    try {
      const tx = await program.methods
        .encryptHash(fileHash)
        .accounts({
          sender: wallet.publicKey,
        })
        .rpc();

      const txDetails = await connection.getTransaction(tx, {
        commitment: "confirmed",
      });
      if (txDetails?.meta?.returnData) {
        const encodedHash = txDetails.meta.returnData.data;
        const encryptedHash = new TextDecoder().decode(
          Buffer.from(encodedHash)
        );
        setEncryptedHash(encryptedHash);
        console.log("Encrypted hash:", encryptedHash);
      } else {
        console.error("No return data found in transaction");
      }
    } catch (error) {
      console.error("Error encrypting file hash:", error);
    }
  };

  const sendEncryptedHash = async () => {
    if (!program || !wallet || !encryptedHash || !recipient || !userAccount) {
      alert(
        "Please encrypt the hash, enter a recipient, and create a user account before sending."
      );
      return;
    }
    try {
      const recipientPubkey = new PublicKey(recipient);
      const [recipientAccountPda] = await PublicKey.findProgramAddress(
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

  const fetchReceivedHash = async () => {
    if (!program || !wallet || !userAccount) {
      alert("Please create a user account first.");
      return;
    }
    try {
      const userAccountInfo = await program.account.userAccount.fetch(
        userAccount
      );
      if (userAccountInfo.receivedFiles.length > 0) {
        const latestFile =
          userAccountInfo.receivedFiles[
            userAccountInfo.receivedFiles.length - 1
          ];
        setReceivedEncryptedHash(latestFile.encryptedHash);
      } else {
        alert("No received files found.");
      }
    } catch (error) {
      console.error("Error fetching received hash:", error);
    }
  };

  const verifyAndDecryptHash = async () => {
    if (!program || !wallet || !receivedEncryptedHash || !userAccount) {
      alert("Please fetch the received encrypted hash first.");
      return;
    }
    try {
      const tx = await program.methods
        .verifyAndDecryptHash(receivedEncryptedHash)
        .accounts({
          recipient: userAccount,
        })
        .rpc();

      const txDetails = await connection.getTransaction(tx, {
        commitment: "confirmed",
      });
      if (txDetails?.meta?.returnData) {
        const encodedHash = txDetails.meta.returnData.data;
        const decryptedHash = new TextDecoder().decode(
          Buffer.from(encodedHash)
        );
        console.log("Decrypted hash:", decryptedHash);
        alert(`File can be fetched from IPFS with hash: ${decryptedHash}`);
      } else {
        console.error("No return data found in transaction");
      }
    } catch (error) {
      console.error("Error verifying and decrypting hash:", error);
    }
  };

  return (
    <div>
      <h1>ZKL-Last-2</h1>
      <WalletMultiButton />
      {wallet && wallet.publicKey && !userType && (
        <div>
          <h2>Select User Type:</h2>
          <button onClick={() => setUserType("sender")}>File Sender</button>
          <button onClick={() => setUserType("receiver")}>File Receiver</button>
        </div>
      )}
      {wallet && wallet.publicKey && userType && (
        <>
          <h2>You are a: {userType}</h2>
          <button onClick={createUserAccount} disabled={userAccount}>
            {userAccount ? "User Account Created" : "Create User Account"}
          </button>
          {userAccount && <p>User Account: {userAccount.toString()}</p>}
          {userType === "sender" && (
            <>
              <input
                type="file"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              {isUploading && <p>Uploading file to IPFS...</p>}
              {fileHash && <p>File hash: {fileHash}</p>}
              <button
                onClick={encryptHash}
                disabled={!fileHash || !userAccount}
              >
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
            </>
          )}
          {userType === "receiver" && (
            <>
              <button onClick={fetchReceivedHash} disabled={!userAccount}>
                Fetch Received Hash
              </button>
              {receivedEncryptedHash && (
                <p>Received encrypted hash: {receivedEncryptedHash}</p>
              )}
              <button
                onClick={verifyAndDecryptHash}
                disabled={!receivedEncryptedHash || !userAccount}
              >
                Verify and Decrypt Hash
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

function App() {
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

export default App;
