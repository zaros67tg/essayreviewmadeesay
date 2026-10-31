"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const SCALES = {
  "A–F": ["A", "B", "C", "D", "E", "F"],
  "0–10": Array.from({ length: 11 }, (_, i) => String(10 - i)),
  "0–100": ["90–100", "80–89", "70–79", "60–69", "50–59", "Below 50"],
  "Pass / Fail": ["Pass", "Fail"],
};
const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;

function GradeContent() {
  const params = useParams();
  const id = params?.id;
  const [d, setD] = useState(null);
  const [scale, setScale] = useState("A–F");
  const [grade, setGrade] = useState("");
  const [signature, setSignature] = useState("");
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const paper = useRef(null);

  useEffect(() => {
    if (!id) return;

    if (id.startsWith("local_")) {
      const local = typeof window !== "undefined" ? localStorage.getItem(`essay_${id}`) : null;
      setD(local ? JSON.parse(local) : false);
      return;
    }

    getDoc(doc(db, "essays", id))
      .then((s) => {
        if (s.exists()) {
          setD(s.data());
        } else {
          const local = typeof window !== "undefined" ? localStorage.getItem(`essay_${id}`) : null;
          setD(local ? JSON.parse(local) : false);
        }
      })
      .catch((err) => {
        console.warn("Firestore fetch error, checking local storage:", err);
        const local = typeof window !== "undefined" ? localStorage.getItem(`essay_${id}`) : null;
        setD(local ? JSON.parse(local) : false);
      });
  }, [id]);

  const words = wordCount(review);
  const ready = grade && signature.trim() && words > 0 && words <= 40 && !submitting;

  async function submit() {
    setSubmitting(true);
    const update = { grade, scale, signature: signature.trim(), review: review.trim(), status: "graded" };

    try {
      if (!id.startsWith("local_")) {
        await updateDoc(doc(db, "essays", id), update);
      } else {
        localStorage.setItem(`essay_${id}`, JSON.stringify({ ...d, ...update }));
      }
      setD({ ...d, ...update });
    } catch (err) {
      console.warn("Firestore update error, saving to local storage:", err);
      if (typeof window !== "undefined") {
        localStorage.setItem(`essay_${id}`, JSON.stringify({ ...d, ...update }));
      }
      setD({ ...d, ...update });
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadPdf() {
    const html2pdf = (await import("html2pdf.js")).default;
    html2pdf().from(paper.current).set({
      margin: 25.4,
      filename: `${d.studentName}-${d.subject}.pdf`,
      jsPDF: { unit: "mm", format: "a4" },
    }).save();
  }

  if (d === null) return <p className="p-6">Loading…</p>;
  if (d === false) return <p className="p-6">Essay not found.</p>;
  const graded = d.status === "graded";
  const box = "w-full border rounded p-2 bg-white text-black";

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div ref={paper} className="bg-white text-black p-4 rounded" style={{ fontFamily: "'Times New Roman', serif", lineHeight: 1.5 }}>
        <h1 className="text-xl font-bold">{d.subject}</h1>
        <p>By {d.studentName}</p>
        <div className="whitespace-pre-wrap my-4">{d.essayText}</div>
        {graded && (
          <div className="border border-black p-3 mt-6" style={{ breakInside: "avoid" }}>
            <p><b>Grade:</b> {d.grade} <span className="text-sm">({d.scale})</span></p>
            <p><b>Review:</b> {d.review}</p>
            <p className="mt-3"><b>Signed:</b> <i>{d.signature}</i></p>
          </div>
        )}
      </div>

      {!graded ? (
        <section className="mt-8 border-t pt-4 space-y-3">
          <label className="block text-sm font-medium">Grading Scale</label>
          <select className={box} value={scale} onChange={(e) => { setScale(e.target.value); setGrade(""); }}>
            {Object.keys(SCALES).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            {SCALES[scale].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                className={`px-3 py-1 rounded border ${grade === g ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"}`}
              >
                {g}
              </button>
            ))}
          </div>
          <label className="block text-sm font-medium">Teacher Review (max 40 words)</label>
          <textarea rows={3} className={box} placeholder="Review (max 40 words)" value={review} onChange={(e) => setReview(e.target.value)} />
          <p className={`text-sm ${words > 40 ? "text-red-600 font-semibold" : "text-gray-500"}`}>{words}/40 words</p>
          <label className="block text-sm font-medium">Digital Signature</label>
          <input className={box} placeholder="Type your full name as signature" value={signature} onChange={(e) => setSignature(e.target.value)} />
          <button disabled={!ready} onClick={submit} className="bg-black text-white px-4 py-2 rounded disabled:opacity-40 hover:bg-gray-800">
            {submitting ? "Submitting..." : "Sign & Submit"}
          </button>
        </section>
      ) : (
        <button onClick={downloadPdf} className="mt-6 px-4 py-2 rounded bg-blue-700 text-white hover:bg-blue-800">
          Download PDF
        </button>
      )}
    </main>
  );
}

export default function Grade() {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <GradeContent />
    </Suspense>
  );
}
