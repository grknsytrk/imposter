# Among Lies

![Among Lies Header](./assets/among_lies_header.png)

A high-stakes social deduction game where your only weapon is your intuition. Invite your friends, join a room, and try to uncover the Imposter hiding among the Innocents. I built this app to provide a seamless real-time experience with immersive visuals and a focus on tense, psychological gameplay.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-4.26-000000?style=flat-square&logo=fastify&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.7-010101?style=flat-square&logo=socket.io&logoColor=white)

## Features

- **Real-time Multiplayer** - Smooth, instantaneous game updates using Socket.io.
- **Vibrant UI/UX** - A custom-designed interface featuring 3D buttons, smooth animations, and a rich color palette (Mystic Violet and Royal Blue).
- **Dynamic Lobby System** - Easily create or join rooms. Track player counts and lobby status in real-time.
- **Role Assignments** - Automatic role distribution. Are you an **Innocent** protecting the group, or the **Imposter** feeding them lies?
- **The Round Table** - A dedicated discussion phase with interactive voting and visual feedback.
- **Unique Avatars** - Personalized gaming experience with a selection of high-quality avatars.
- **Secure Auth** - Full account integration using **Supabase Auth**.
- **Localized** - Support for both English and Turkish out of the box.
- **Mobile Ready** - Fully responsive design that keeps the game immersive on any device.

## The Gameplay

Among Lies is all about deception and observation:

- **Lobby Phase**: Gather players and wait for the host to start.
- **Role Reveal**: Secretly find out if you're the Imposter or an Innocent.
- **Round Table**: Discuss, argue, and share theories in the chat.
- **Voting Phase**: Cast your vote for the person you suspect the most.
- **Final Result**: See if the Innocents caught the liar or if the Imposter won the day.

## Getting Started

### Prerequisites

You'll need Node.js version 20 or higher. The project structure is a monorepo managed with Turborepo.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/grknsytrk/among-lies.git
   cd among-lies
   ```

2. Install the dependencies for everything:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` in `apps/client` (Supabase keys)
   - Create a `.env` in `apps/server` (Port and Host)

4. Run the development environment:
   ```bash
   npm run dev
   ```

5. Go to `http://localhost:5173` and start playing.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | Frontend Library |
| Fastify | Backend Web Framework |
| Socket.io | Real-time Communication |
| TypeScript | Full-stack Type Safety |
| Tailwind CSS 4 | Modern Styling |
| Framer Motion | UI Animations |
| Zustand | State Management |
| Supabase | Auth & Database |
| Turborepo | Monorepo Management |

## Project Structure

```
.
├── apps/
│   ├── client/           # The React frontend
│   │   ├── src/components # Game components (Table, Avatars, etc.)
│   │   ├── src/pages      # Main views (Home, Auth, Game)
│   │   └── src/locales    # i18n translations
│   └── server/           # The Fastify backend
│       ├── src/handlers   # Socket event logic
│       └── src/logic      # Game state engine
├── packages/
│   └── shared/           # Types and constants used by both apps
└── turbo.json            # Monorepo config
```

## Contributing

Suggestions and bug reports are always welcome.

1. Fork the repo
2. Create a branch (`feature/my-feature`)
3. Commit and push
4. Open a PR

## License

This project is open-source under the MIT License.

---

Ready to find the liar? Start your room now!
