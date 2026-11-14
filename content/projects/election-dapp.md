---
title: Election dApp
tagline: Votes nobody can quietly change.
year: 2023
role: Solo
order: 6
stack: [Solidity, Hardhat, Web3.js, Next.js, Express, MongoDB]
highlight: A clean-architecture Node backend sits in front of the contract, clustered with PM2 and covered by Jest and Supertest.
repo: https://github.com/lamaparbat/BLOCKCHAIN-ELECTION-DAPP
live: https://dappvote.vercel.app
art: s11
also: true
alsoNote: Solidity, Next.js
kicker: Web3 · full-stack
---

A decentralised voting system on Ethereum.

## What it does

- Voter registration and verification
- Ballot creation
- On-chain vote casting through MetaMask
- Tamper-proof result tabulation

## Behind the contract

The smart contract sits behind a clean-architecture Node backend. Express runs clustered under PM2, and Jest with Supertest covers the API layer.
