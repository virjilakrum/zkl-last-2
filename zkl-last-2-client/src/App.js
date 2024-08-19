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

const ipfs = create({ host: "ipfs.infura.io", port: 5001, protocol: "https" });
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

  useEffect(() => {
    const connection = new Connection(
      "http://localhost:8899",
      opts.preflightCommitment
    );
    const provider = new AnchorProvider(connection, wallet, opts);
    const program = new Program(idl, programID, provider);
    setProgram(program);
  }, [wallet]);

  // ... rest of your component logic (handleFileChange, handleRecipientChange, uploadToIPFS, createUserAccount, sendFileHash, handleSubmit)

  return (
    <div>
      <h1>ZKL-Last-2</h1>
      <WalletMultiButton />
      {wallet.connected && (
        <>
          <button onClick={createUserAccount}>Create User Account</button>
          <input type="file" onChange={handleFileChange} />
          <input
            type="text"
            placeholder="Recipient's public key"
            value={recipient}
            onChange={handleRecipientChange}
          />
          <button onClick={handleSubmit}>Send File</button>
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
