# STON.FI DEX TON Swap Service

An automated TypeScript service for performing token swaps on the TON blockchain using STON.fi DEX. The service executes swaps programmatically using your wallet's mnemonic phrase, without requiring manual confirmations in TON Wallet. Perfect for automated trading strategies and bot implementations. 🔄

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- TON wallet with mnemonic phrase
- API key for TON blockchain

## Important Note ⚠️

This project uses `@ton/ton` version 15.1.0 as it has been tested and verified to work correctly. Higher versions may cause compatibility issues.

## Installation

### Standard Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <project-directory>
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
TON_CLIENT_API_KEY=your_api_key_here
MNEMONIC="your 24 word mnemonic phrase here"
```

You can get your TON API key through the official Telegram bot: [@tonapibot](https://t.me/tonapibot)

### Docker Installation

1. Clone the repository and navigate to the project directory:
```bash
git clone <repository-url>
cd <project-directory>
```

2. Run using Docker Compose:
```bash
# Run with environment variables
TON_CLIENT_API_KEY=your_key MNEMONIC="your mnemonic" docker-compose up -d
```

The service will be available at `http://localhost:3000`.

## Scripts

The project includes several npm scripts for development and testing:

### Development
- `npm run dev` - Start the development server with hot reload using tsx
- `npm start` - Run the compiled version from dist directory
- `npm run build` - Compile TypeScript to JavaScript
- `npm run clean` - Remove the dist directory
- `npm run rebuild` - Clean and rebuild the project

### Code Quality
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Fix automatically fixable ESLint issues

### Testing
- `npm run test:price` - Test the price service functionality
- `npm run test:swap` - Test the swap service functionality
