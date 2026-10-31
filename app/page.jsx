"use client";
import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Home() {
  const [f, setF] = useState({ studentName: "", subject: "", essayText: "" });
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const ref = await addDoc(collection(db, "essays"), {
        ...f,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setLink(`${location.origin}/grade/${ref.id}`);
    } catch (err) {
      console.warn("Firestore error:", err);
      // If Firestore rules are locked or missing credentials, fallback gracefully to browser storage
      if (err.code === "permission-denied" || err.message?.toLowerCase().includes("permission")) {
        const localId = "local_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const data = { ...f, status: "pending", createdAt: new Date().toISOString() };
        if (typeof window !== "undefined") {
          localStorage.setItem(`essay_${localId}`, JSON.stringify(data));
        }
        setLink(`${location.origin}/grade/${localId}`);
        setNotice("Saved locally in browser! Note: Your Firebase rules in Firebase Console currently block cloud writes. Update firestore.rules in Firebase Console to enable cloud sync.");
      } else {
        setError(err.message || "Failed to submit essay.");
      }
    } finally {
      setLoading(false);
    }
  }

  const box = "w-full border rounded p-2 bg-white text-black";
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Submit Essay</h1>
      <form onSubmit={submit} className="space-y-3">
        <input required className={box} placeholder="Your name" value={f.studentName} onChange={set("studentName")} />
        <input required className={box} placeholder="Subject" value={f.subject} onChange={set("subject")} />
        <textarea required rows={16} className={box} placeholder="Paste your essay" value={f.essayText} onChange={set("essayText")} />
        <button disabled={loading} className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50">
          {loading ? "Generating link..." : "Get link for teacher"}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

      {notice && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded text-sm">
          ⚠️ {notice}
        </div>
      )}

      {link && (
        <div className="p-4 bg-gray-50 border rounded space-y-2">
          <p className="font-semibold text-green-700">✓ Essay submitted successfully!</p>
          <p className="break-all">
            Send this to your teacher:{" "}
            <a className="underline text-blue-600 font-medium" href={link} target="_blank" rel="noopener noreferrer">
              {link}
            </a>
          </p>
        </div>
      )}
    </main>
  );
}
