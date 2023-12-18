import { EthereumClient, w3mConnectors } from "@web3modal/ethereum";
import { Web3Modal } from "@web3modal/html";
import {
	configureChains,
	createConfig,
	prepareWriteContract,
} from "@wagmi/core";
import { polygon } from "@wagmi/core/chains";
import { getAccount } from "@wagmi/core";
import {
	writeContract,
	readContract,
	watchAccount,
	waitForTransaction,
} from "@wagmi/core";
import { contractAddress, contractAbi } from "./constants";
import { parseEther, parseUnits } from "viem";
import { alchemyProvider } from "@wagmi/core/providers/alchemy";

const bottomCoreBtn = document.querySelector("#bottomCoreeButton");
const mintBtn = document.querySelector("#mintButton");
const mintState = document.querySelector("#mint-state");
const price = document.querySelector("#mint-price");
const totalTokensMinted = document.querySelector("#tot-minted");

const incrementBtn = document.querySelector("#incrementButton");
const decrementBtn = document.querySelector("#decrementButton");
let quantityValue = document.querySelector("#quantity");
const mintResult = document.querySelector("#mintResult");

const chains = [polygon];
const projectId = "f17324ddef2db4655241c614a840c679";

// const { publicClient } = configureChains(chains, [w3mProvider({ projectId })]);
const { publicClient } = configureChains(chains, [
	alchemyProvider({ apiKey: "j0VI-gwXeJBEm5AeQf9rk3BsD5Q-GKHT" }),
]);
const wagmiConfig = createConfig({
	connectors: w3mConnectors({ projectId, chains }),
	publicClient,
	autoConnect: true,
});
const ethereumClient = new EthereumClient(wagmiConfig, chains);
const web3Modal = new Web3Modal({ projectId }, ethereumClient, {
	themeMode: "dark",
	defaultChain: polygon,
});

let isMintOpen, mintPrice, totalMinted;

window.onload = async () => {
	// mint state
	isMintOpen = await readContract({
		address: contractAddress,
		abi: contractAbi,
		functionName: "isMintOpen",
	});

	// price
	mintPrice = await readContract({
		address: contractAddress,
		abi: contractAbi,
		functionName: "getPrice",
	});

	// total of minted tokens
	totalMinted = await readContract({
		address: contractAddress,
		abi: contractAbi,
		functionName: "getTotalMinted",
	});

	// update html sections
	mintState.innerText = isMintOpen ? "OPEN" : "CLOSED";
	price.innerText = mintPrice.toString() / 1e18 + " MATIC";
	totalTokensMinted.innerText = totalMinted.toString();
};

let account = getAccount();
if (account.status == "connected") {
	bottomCoreBtn.style.display = "none";
	mintBtn.style.display = "";
} else if (account.status == "disconnected") {
	mintBtn.style.display = "none";
	bottomCoreBtn.style.display = "";
}
const unwatch = watchAccount((account) => {
	account = getAccount();
	console.log(account);
	if (account.status == "connected") {
		bottomCoreBtn.style.display = "none";
		mintBtn.style.display = "";
		mintResult.innerText = "";
	} else if (account.status == "disconnected") {
		mintBtn.style.display = "none";
		bottomCoreBtn.style.display = "";
		mintResult.innerText = "";
	}
});

mintBtn.addEventListener("click", async () => {
	// if mint open -> mint
	if (isMintOpen == true) {
		await mint("mintMINI", mintPrice);
	} else {
		mintBtn.style.display = "none";
		mintResult.innerText = "Mint is Closed :(";
	}
});

async function mint(mintFunctionName, price) {
	// const amount = quantityValue.value;
	const ethAmount = price.toString() / 1e18;
	try {
		mintResult.innerText = "Minting...";
		mintBtn.style.display = "none";

		const { request } = await prepareWriteContract({
			address: contractAddress,
			abi: contractAbi,
			functionName: mintFunctionName,
			args: [],
			chainId: 137,
			value: parseEther(ethAmount.toString()),
		});
		const { hash } = await writeContract(request);
		const data = await waitForTransaction({
			confirmations: 3,
			chainId: 137,
			hash,
		});

		console.log(data);
		mintResult.innerText =
			"Minted with success!\n\nClick here to view your transaction";
		mintResult.href = `https://polygonscan.com/tx/${data.transactionHash}`;
	} catch (error) {
		console.log(error);
		handleError(error);
	}
}

function handleError(error) {
	if (error.message.includes("InsufficientAmount")) {
		mintResult.innerText = "Couldn't mint your tokens!\n\nYou need more MATIC!";
	} else if (error.message.includes("ExceedsTotalSupply")) {
		mintResult.innerText = "Couldn't mint your tokens!\n\nMax supply reached";
	} else if (error.message.includes("MaxQuantityMintableExceeded")) {
		mintResult.innerText =
			"Couldn't mint your tokens!\n\nYou reached your Maximum!";
	} else if (error.message.includes("User denied transaction signature")) {
		mintResult.innerText = "User denied transaction signature";
	} else if (error.message.includes("exceeds the balance of the account")) {
		mintResult.innerText =
			"Couldn't mint your tokens!\n\nYour account does not have enough funds to submit the transaction!";
	} else {
		mintResult.innerText = "Couldn't mint your tokens!\n\nSomething went wrong";
	}
}
