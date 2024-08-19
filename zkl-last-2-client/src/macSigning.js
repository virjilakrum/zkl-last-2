import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";

const signWithMAC = (message, key) => {
  const messageUint8 = new TextEncoder().encode(message);
  const keyUint8 = new TextEncoder().encode(key);
  const signature = hmac(sha256, keyUint8, messageUint8);
  return Buffer.from(signature).toString("hex");
};

export default signWithMAC;
