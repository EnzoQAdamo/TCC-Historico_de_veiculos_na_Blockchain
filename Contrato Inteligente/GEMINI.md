# GEMINI Project Analysis: Vehicle Ledger

## Project Overview

This is a Hardhat project that implements a `VehicleLedger` smart contract on the Ethereum blockchain. The contract is designed to create a transparent and tamper-proof history for vehicles. It uses a role-based access control system to allow different entities (like DMVs, mechanics, and insurers) to add records to a vehicle's history.

The contract is written in Solidity and utilizes the OpenZeppelin library for standard and secure components like `AccessControl`. The contract tracks various aspects of a vehicle's life, including:

*   Static vehicle data (brand, model, year)
*   Ownership history
*   Accident records
*   Title status (clean, salvage, etc.)
*   Mileage readings
*   Service and maintenance history
*   Manufacturer recalls

The comments within the `VehicleLedger.sol` contract are written in Portuguese.

## Building and Running

### Installation

To get started, install the necessary Node.js dependencies:

```bash
npm install
```

### Key Commands

The project uses Hardhat's built-in tasks for common operations. The `package.json` scripts are not fully configured, so you should use the `npx` command directly.

*   **Compile Contracts:** Compiles the Solidity smart contracts in the `contracts/` directory.
    ```bash
    npx hardhat compile
    ```

*   **Run Tests:** Executes the test suite located in the `test/` directory using the Hardhat network.
    ```bash
    npx hardhat test
    ```

*   **Run a Local Test Node:** Starts a local Ethereum node for development and testing.
    ```bash
    npx hardhat node
    ```

*   **Deploy Contract (Placeholder):** The project includes a sample Ignition module (`ignition/modules/Lock.js`) from the default Hardhat template. To deploy the `VehicleLedger` contract, you would need to create a new Ignition module for it. For example:

    ```javascript
    // ignition/modules/VehicleLedger.js
    const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

    module.exports = buildModule("VehicleLedgerModule", (m) => {
      const ledger = m.contract("VehicleLedger");

      return { ledger };
    });
    ```

    You could then deploy it to a network with:
    ```bash
    npx hardhat ignition deploy ./ignition/modules/VehicleLedger.js --network localhost
    ```

## Development Conventions

*   **Framework:** The project is built using the [Hardhat](https://hardhat.org/) development environment for Ethereum.
*   **Smart Contracts:** Contracts are written in Solidity and are located in the `contracts/` directory.
*   **Testing:** Tests are written in JavaScript using `ethers.js` and the `chai` assertion library. Test files are located in the `test/` directory and follow the naming convention `*.test.js`. The tests are well-structured, with clear `describe` blocks for different contract features and a `beforeEach` hook to ensure a clean state for each test.
*   **Access Control:** The `VehicleLedger.sol` contract uses OpenZeppelin's `AccessControl` component to manage permissions. Different roles (e.g., `DMV_ROLE`, `MECHANIC_ROLE`) are defined to restrict who can call sensitive functions.
*   **Dependencies:** Project dependencies are managed with `npm`. Key dependencies include `@openzeppelin/contracts` for the smart contract and various Hardhat plugins (`@nomicfoundation/hardhat-toolbox`) for development and testing.
