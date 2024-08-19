import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, Provider } from "@project-serum/anchor";

const App = () => {
  const wallet = useWallet();
  const [file, setFile] = useState(null);
  const [recipient, setRecipient] = useState("");

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleRecipientChange = (event) => {
    setRecipient(event.target.value);
  };

  const handleSubmit = async () => {
    if (!file || !recipient) {
      alert("Please select a file and enter a recipient.");
      return;
    }

    // TODO: Implement file upload to IPFS 🏗️
    // TODO: Implement sending signed file hash to recipient 🏗️
  };

  return (
    <div>
      <h1>ZKL-Last-2</h1>
      <WalletMultiButton />
      {wallet.connected && (
        <>
          <input type="file" onChange={handleFileChange} />
          <input
            type="text"
            placeholder="Recipient's public key"
            value={recipient}
            onChange={handleRecipientChange}
          />
          <button onClick={handleSubmit}>Send File</button>
        </>
      )}
    </div>
  );
};

export default App;
