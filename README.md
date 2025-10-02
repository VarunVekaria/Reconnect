# 🧠 Dementia Assistant – MemoryBook

[![Next.js](https://img.shields.io/badge/Next.js-13+-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38b2ac?logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A calm, image-driven memory aid and caregiver communication tool for dementia patients.  
The app helps patients revisit key moments via photos and lets caregivers/family members leave contextual **voice notes** to guide memory and interaction.

⚡ Built with **Next.js App Router, TypeScript, Tailwind, and local JSON APIs**.  
Ideal for **offline-first deployment** or as a proof-of-concept for scaling to cloud infrastructure.

---

## ✨ Features

- 🖼️ **Photo Memories** – Upload and display event-based memories with metadata (date, place, people).
- 🔊 **Voice Notes** – Caregivers can record and upload contextual audio messages for each memory.
- 📱 **WhatsApp Invites** – Auto-generate WhatsApp links so family members can contribute voice notes remotely.
- 🎧 **Audio Playback** – When a patient revisits a memory, any associated voice notes are playable directly.
- 🌐 **JSON-based Backend** – Lightweight, file-backed API storage (`memory.json`, `voiceNotes.json`).
- ⚙️ **Extensible Design** – Abstracted API layer makes it easy to swap JSON for Firebase, Supabase, DynamoDB, or S3.

---

## 🚀 Getting Started

### 1. Clone the Repo

```bash
https://github.com/VarunVekaria/Reconnect.git
cd dementia-assistant
