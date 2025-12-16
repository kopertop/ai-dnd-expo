import torchaudio as ta
import torch
from chatterbox.tts_turbo import ChatterboxTurboTTS

# Auto-select device
device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
print(f"Using device: {device}")

# Load the Turbo model
model = ChatterboxTurboTTS.from_pretrained(device=device)

# Generate with Paralinguistic Tags
text = "Hi there, Sarah here from MochaFone calling you back [chuckle], have you got one minute to chat about the billing issue?"

# Generate audio (requires a reference clip for voice cloning)
wav = model.generate(text, audio_prompt_path="sample.wav")

ta.save("test-turbo.wav", wav, model.sr)
