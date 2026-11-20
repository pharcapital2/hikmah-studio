#!/usr/bin/env python3
"""Generate voice-over for one Hikmah Studio content the economical way.

Metode baru (keputusan Kholik 2026-11-20): Gemini TTS membaca hingga ~5 menit
per request, jadi satu video cukup 2 request API:
  1. SATU request multi-speaker untuk seluruh dialog (maks. 2 pembicara
     per request — Gemini hanya mendukung 2 speaker per request).
  2. SATU request single-speaker untuk seluruh narasi (semua baris narator
     dalam satu request, dipisah berdasarkan jeda hening saat mixing).
Free tier mengizinkan 10 request/hari = 5 video/hari. Jangan pecah dialog
per baris — itu membakar kuota (pelajaran Konten 3: 7 request untuk satu
adegan, 2 baris kena batas harian).

Input: file skrip suara JSON, contoh di scripts/vo-script.example.json:
  {
    "content": "konten-4",
    "voices": {"narator": "Kore", "Fajar": "Puck", "Bu Aminah": "Aoede"},
    "dialogue": [{"id": "d3", "speaker": "Fajar", "style": "...", "text": "..."}],
    "narration": [{"id": "d1", "speaker": "narator", "style": "...", "text": "..."}]
  }

Penggunaan:
  generate_vo.py <skrip.json> <direktori-output> [--dry-run]
  --dry-run: hanya menulis file request JSON, tanpa memanggil API.

Output di <direktori-output>:
  dialogue-request.json / narration-request.json — badan request API.
  dialogue.wav / narration.wav — audio hasil generate (bukan dry-run).
  timing.json — durasi terukur tiap file (total + rentang bicara),
    segmen-segmen bicara pada file dialog (hasil silencedetect), dan
    perkiraan kasar durasi tiap giliran dari jumlah kata.
    UNTUK JENDELA DIALOG: dengarkan file dialog sekali dan kelompokkan
    segmen ke tiap giliran berdasarkan teks (giliran berurutan sesuai
    skrip); pakai start/end segmen sebagai jendela. Jangan memakai
    perkiraan jumlah kata sebagai jendela — kecepatan tiap giliran
    bervariasi dan pengelompokan otomatis terbukti tidak bisa diandalkan
    (diuji di Konten 3: F0 kedua suara tumpang tindih, jeda '...' meniru
    jeda antar giliran).

Kunci API tidak pernah ada di skrip ini: pemanggilan API lewat helper
custom.gemini (bin/gemini_tts.py) yang memakai kredensial tersimpan.
"""

import json
import re
import struct
import subprocess
import sys
import wave
from pathlib import Path

HELPER = Path.home() / "workspace/custom-connectors/custom.gemini/bin/gemini_tts.py"
MODEL = "gemini-3.8-flash-tts"
MAX_SPEAKERS_PER_REQUEST = 2


def build_dialogue_request(turns: list[dict], voices: dict) -> dict:
    speakers = []
    for t in turns:
        if t["speaker"] not in speakers:
            speakers.append(t["speaker"])
    if len(speakers) > MAX_SPEAKERS_PER_REQUEST:
        raise ValueError(
            f"dialog punya {len(speakers)} pembicara {speakers}; "
            f"maks. {MAX_SPEAKERS_PER_REQUEST} per request — pecah adegan."
        )
    return {
        "model": MODEL,
        "input": [
            {
                "type": "user_input",
                "content": [
                    {
                        "type": "text",
                        "text": t["text"],
                        "annotations": [
                            {
                                "type": "speech_metadata",
                                "speaker": t["speaker"],
                                "style": t.get("style", ""),
                            }
                        ],
                    }
                    for t in turns
                ],
            }
        ],
        "response_format": {"type": "audio"},
        "generation_config": {
            "speech_config": {
                "speakers": [
                    {"speaker": s, "voice": voices[s]} for s in speakers
                ]
            }
        },
    }


def build_narration_request(lines: list[dict], voices: dict) -> dict:
    speakers = []
    for line in lines:
        if line["speaker"] not in speakers:
            speakers.append(line["speaker"])
    if len(speakers) != 1:
        raise ValueError(
            f"narasi harus 1 suara, ditemukan {speakers} — pecah per suara."
        )
    voice = voices[speakers[0]]
    # Satu request, semua baris digabung dengan jeda kalimat; pemisahan
    # tiap baris dilakukan dari jeda hening saat mixing (lihat timing.json).
    text = " ".join(line["text"] for line in lines)
    style = lines[0].get("style", "")
    return {
        "model": MODEL,
        "input": [
            {
                "type": "user_input",
                "content": [
                    {
                        "type": "text",
                        "text": text,
                        "annotations": [
                            {"type": "speech_metadata", "style": style}
                        ],
                    }
                ],
            }
        ],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": voice}]},
    }


def speech_span(path: Path, threshold: int = 400) -> dict:
    """Durasi total + rentang bicara (pangkas hening awal/akhir)."""
    with wave.open(str(path)) as w:
        n, sr = w.getnframes(), w.getframerate()
        samples = struct.unpack(f"<{n}h", w.readframes(n))
    first = next((i for i, s in enumerate(samples) if abs(s) > threshold), None)
    last = next(
        (i for i in range(n - 1, -1, -1) if abs(samples[i]) > threshold), None
    )
    if first is None:
        return {"total": n / sr, "speech": 0.0, "lead": n / sr, "tail": 0.0}
    return {
        "total": round(n / sr, 2),
        "speech": round((last - first + 1) / sr, 2),
        "lead": round(first / sr, 2),
        "tail": round((n - 1 - last) / sr, 2),
    }


def silence_segments(path: Path, min_gap: float = 0.4) -> list[dict]:
    """Segmen bicara (start/end/durasi) dari ffmpeg silencedetect."""
    cmd = [
        "ffmpeg", "-v", "info", "-i", str(path),
        "-af", f"silencedetect=noise=-40dB:d={min_gap}",
        "-f", "null", "-",
    ]
    out = subprocess.run(cmd, capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    total = speech_span(path)["total"]
    segments, cursor = [], 0.0
    for s, e in zip(starts, ends):
        if s > cursor:
            segments.append({"start": round(cursor, 2), "end": round(s, 2),
                             "dur": round(s - cursor, 2)})
        cursor = e
    if cursor < total:
        segments.append({"start": round(cursor, 2), "end": round(total, 2),
                         "dur": round(total - cursor, 2)})
    return segments


def turn_rough_estimates(turns: list[dict], total_speech: float) -> list[dict]:
    """Perkiraan kasar durasi tiap giliran dari jumlah kata — HANYA panduan.

    Kecepatan bicara tiap giliran bervariasi (jeda '...' dan emosi), jadi
    angka ini TIDAK BOLEH dipakai langsung sebagai jendela dialog.
    Cara yang benar: dengarkan file dialog sekali, kelompokkan segmen
    bicara ke tiap giliran berdasarkan teks (giliran berurutan sesuai
    skrip), lalu pakai start/end segmen sebagai jendela.
    """
    total_words = sum(len(t["text"].split()) for t in turns)
    return [
        {
            "turn": t["id"],
            "speaker": t["speaker"],
            "words": len(t["text"].split()),
            "rough_dur": round(
                (len(t["text"].split()) / total_words) * total_speech, 2
            ) if total_words else 0,
        }
        for t in turns
    ]


def run_tts(request_path: Path, output_path: Path) -> None:
    cmd = ["python3", str(HELPER), str(request_path), str(output_path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stdout, file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        raise RuntimeError(f"gagal generate {output_path.name} (lihat pesan API di atas)")
    print(result.stdout.strip())


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print("usage: generate_vo.py <skrip.json> <direktori-output> [--dry-run]")
        return 2
    script_path, out_dir = Path(argv[1]), Path(argv[2])
    dry_run = "--dry-run" in argv[3:]
    script = json.loads(script_path.read_text(encoding="utf-8"))
    voices = script["voices"]
    out_dir.mkdir(parents=True, exist_ok=True)

    requests = {}
    if script.get("dialogue"):
        requests["dialogue"] = build_dialogue_request(script["dialogue"], voices)
    if script.get("narration"):
        requests["narration"] = build_narration_request(script["narration"], voices)

    timing: dict = {"content": script.get("content"), "requests_used": len(requests)}
    for name, req in requests.items():
        req_path = out_dir / f"{name}-request.json"
        req_path.write_text(json.dumps(req, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"wrote {req_path}")
        if dry_run:
            continue
        wav_path = out_dir / f"{name}.wav"
        run_tts(req_path, wav_path)
        span = speech_span(wav_path)
        timing[name] = {"file": wav_path.name, **span}
        if name == "dialogue":
            segments = silence_segments(wav_path)
            timing["dialogue"]["segments"] = segments
            timing["dialogue"]["turns_rough"] = turn_rough_estimates(
                script["dialogue"], span["speech"]
            )
            print(f"dialogue: {len(segments)} segmen bicara terdeteksi — "
                  f"kelompokkan manual ke giliran (lihat timing.json)")

    (out_dir / "timing.json").write_text(
        json.dumps(timing, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(timing, ensure_ascii=False, indent=2))
    if not dry_run:
        print(f"\nSelesai: {len(requests)} request API untuk konten "
              f"'{script.get('content')}' (kuota free tier: 10/hari).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
