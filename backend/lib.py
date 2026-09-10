from typing import List
import re
import webview
from dataclasses import dataclass, asdict
import subprocess
import numpy as np
import datetime

def to_ms(h: str, m: str, s: str, ms: str) -> int:
    return int(h) * 3_600_000 + int(m) * 60_000 + int(s) * 1_000 + int(ms)

def from_ms(ms: int) -> str:
    seconds, milliseconds = divmod(ms, 1000)
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"


@dataclass
class Subtitle:   
    fromTime: int
    toTime: int
    text: str

    def __init__(self, fromTime: int, toTime: int, text: str):
        self.fromTime = fromTime
        self.toTime = toTime
        self.text = text

    def __str__(self):
        return f"{from_ms(self.fromTime)} --> {from_ms(self.toTime)}\n{self.text}"

    def __repr__(self):
        return f"from: {self.fromTime}, to: {self.toTime}, text: \"{self.text}\""

class Subtitles:
    def __init__(self, subtitles: List[Subtitle]):
        self.subtitles = subtitles

    def fromFile(filePath: str):
        subs = []
        pattern = (r"(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})")

        with open(filePath, "r") as file:
            lines = []
            for line in file:
                lines.append(line.strip())

            sublines = []
            for line in lines:
                if(line == ""):
                    if len(sublines) < 3:
                        raise ValueError(f"Invalid format")
                    _idx = sublines[0]
                    match = re.search(pattern, sublines[1])
                    if not match:
                        raise ValueError(f"Invalid SRT timestamp format: '{line.strip()}'")
                    groups = match.groups()
                    start_ms = to_ms(groups[0], groups[1], groups[2], groups[3])
                    end_ms = to_ms(groups[4], groups[5], groups[6], groups[7])
                    text = '\n'.join(sublines[2:])
                    sub = Subtitle(start_ms, end_ms, text)
                    subs.append(sub)
                    sublines = []
                    continue
                sublines.append(line)
            
        return Subtitles(subs)
    
    def to_dict_list(self) -> List[dict]:
        # Converte la lista di oggetti in una lista di dizionari serializzabili
        return [asdict(sub) for sub in self.subtitles]

    def __str__(self):
        return f"[{'\n'.join(str(x) for x in self.subtitles)}]"
    
    def __repr__(self) -> str:
        return f"Subtitles({self.subtitles!r})"

def process_video_ffmpeg(video_path, audio_output="output.wav", sample_rate=44100, bin_ms=10):
    # 1. Extract audio track to file
    # subprocess.run(
    #     ["ffmpeg", "-y", "-i", video_path, "-vn", "-acodec", "pcm_s16le", audio_output],
    #     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True
    # )

    # 2. Pipe raw 16-bit PCM mono audio directly into memory
    cmd = [
        "ffmpeg", "-i", video_path,
        "-vn", "-ac", "1", "-ar", "44100",
        "-f", "s16le", "pipe:1"
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    raw_bytes, _ = proc.communicate()

    # 3. Convert raw bytes to normalized float array [-1.0, 1.0]
    audio = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0

    # 4. Compute 10ms envelope bins
    samples_per_bin = int(sample_rate * (bin_ms / 1000.0))
    num_bins = len(audio) // samples_per_bin

    binned = audio[:num_bins * samples_per_bin].reshape((num_bins, samples_per_bin))
    envelope = np.abs(binned).mean(axis=1)

    return envelope

class Api:
    def load_srt(self, filename: str):
        return Subtitles.fromFile(filename).to_dict_list()

    def save_srt(self, subs, filename: str):
        with open(filename, 'w') as file:
            for i, sub in enumerate(subs):
                file.write(f"{i}\n{Subtitle(sub['fromTime'], sub['toTime'], sub['text'])}\n\n")
        return

    def load_waveform(self, filename: str):
        return process_video_ffmpeg(filename).tolist()


if __name__ == "__main__":
    api = Api()

    window = webview.create_window('Test app', 'http://localhost:34911', js_api = api)
    webview.start(debug=True)

    
