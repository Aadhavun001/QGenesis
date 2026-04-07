<div align="center">
  <h1>🌟 QGenesis</h1>
  <h3><strong>Intelligent Academic Question Generation System</strong></h3>
  <p>An enterprise-grade, AI-driven educational platform that empowers academic institutions to seamlessly extract material, dynamically generate assessments, and securely govern examinations utilizing state-of-the-art NLP pipelines and Cloud architecture.</p>
</div>

---

## 📖 Project Overview

**QGenesis** modernizes the traditional academic assessment process. Rather than relying on manual question drafting, educators can upload heavy syllabus files to instantly receive varied, highly-curated, curriculum-aligned questions. Powered by **Google Gemini AI** and advanced parameter controls, the platform automatically calibrates Bloom's Taxonomy, syllabus constraints, and difficulty parameters to output production-ready Question Papers.

Developed as a rigorous demonstration of full-stack software engineering, QGenesis serves as a benchmark for deploying advanced generative AI within strict, secure, and intuitive enterprise constraints.

---

## 🔥 Highlighted Features & Capabilities

### 🧠 Advanced AI & NLP Integration
* **Intelligent RAG Pipeline**: Integrates **Google Gemini AI** with strict custom-tailored prompting techniques to prevent hallucinations, ensuring generated questions are perfectly constrained to the provided academic source material.
* **Semantic Material Extraction**: A dedicated Python/FastAPI backend handles heavy lifting—parsing dense collegiate PDFs, applying natural language chunking algorithms, and surfacing core topical maps prior to AI generation.
* **Granular Generation Controls**: Staff can dynamically dial in the exact *Difficulty Matrix*, *Bloom's Taxonomy Cognitive Level*, *Question Type (MCQ, Descriptive, Essay)*, and *Marks Distribution*.

### 🛡️ Enterprise Security & RBAC Routing
* **Strict Role-Based Access Control**: Deeply routed authorization utilizing Firebase Auth and Firestore Security Rules spanning **Public, Staff, Head of Department (HOD), and App Admin**.
* **Four Distinct Dashboards**:
  * **Staff Area**: Upload materials, generate questions, create draft papers.
  * **HOD Sector**: Approval pipelines to accept/reject questions to prevent assessment leaks or sub-standard questions.
  * **Admin Overview**: Full-scale metrics, universal user activity tracking, feedback management, and system configuration.
  * **Public Interface**: A stunning landing page demonstrating the platform's value proposition with live, real-time statistics.

### ⚡ Blazing Fast, Beautiful UX/UI
* **Real-time Firehose**: Built completely around Firestore's `onSnapshot` listeners. Statistics, approvals, and user feedback sync instantaneously across the platform without requiring browser reloads.
* **Modern Interface**: Designed using **React, TailwindCSS, and Framer Motion**. Features glass-morphism elements, strict responsive mobile-first paradigms, dynamic micro-animations, and seamless dark mode capabilities to provide an incredibly premium feel.

---

## 🛠️ Complete Technology Stack

| Domain | Core Technologies & Libraries |
|---|---|
| **Frontend Foundation** | React 18, TypeScript, Vite |
| **Styling & UI Components** | TailwindCSS, shadcn/ui, Framer Motion, Lucide Icons |
| **State Management** | Zustand (Persistent Local & Global stores) |
| **Backend & Microservices** | Python 3.9+, FastAPI, Uvicorn |
| **Cloud Infrastructure** | Google Firebase (Firestore NoSQL, Storage, Auth, Security Rules) |
| **Artificial Intelligence** | `@google/generative-ai` (Gemini Pro Models) |
| **Deployment & Hosting** | Vercel (Edge Frontend), Firebase Cloud Functions (Backend Hooks) |

---

## ⚙️ Architecture Design

QGenesis utilizes a highly scalable **decoupled client-server architecture**:
1. **The Client (Vite/React)**: Acts as a rapidly responsive Single-Page Application (SPA). It orchestrates complex state via Zustand and establishes direct, natively-secured TCP connections to Firestore for rapid real-time actions.
2. **The Extraction Microservice (Python)**: Heavy data processing—such as parsing heavy PDFs and applying semantic extraction algorithms—is offloaded to a designated Python/Uvicorn API, ensuring the frontend client remains blazingly fast and completely untethered from heavy compute burdens.
3. **The Database Layer (Firestore)**: Secured via rigorous `firestore.rules`, ensuring lateral attacks are impossible and data fetching is explicitly limited to the requesting user's authorization role.

---

## 🚀 Complete Local Setup & Installation

Follow these steps to run QGenesis flawlessly on your local machine.

### 📋 Prerequisites
* **Node.js** (v18 or higher)
* **Python** (v3.9 or higher)
* **Git** installed on your terminal
* A **Firebase** Account & Project
* A **Google Gemini API Key**

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Aadhavun001/QGenesis.git
cd QGenesis
