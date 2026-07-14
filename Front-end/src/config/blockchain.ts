import { ethers } from 'ethers';
import RegistroVeicularArtifact from './RegistroVeicular.json';

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string;
const CHAIN_ID = BigInt(import.meta.env.VITE_CHAIN_ID ?? "31337");
const RPC_FALLBACK = import.meta.env.VITE_RPC_FALLBACK ?? "http://127.0.0.1:8545";

// Role Hashes (keccak256)
export const ROLES = {
    ADMIN: "0x0000000000000000000000000000000000000000000000000000000000000000",
    DMV: ethers.id("DMV_ROLE"),
    MECHANIC: ethers.id("MECHANIC_ROLE"),
    MANUFACTURER: ethers.id("MANUFACTURER_ROLE"),
    INSURER: ethers.id("INSURER_ROLE"),
    DEALER: ethers.id("DEALER_ROLE")
};

// Mapeamento de Endereços -> Nomes (Evita salvar strings na blockchain)
export const MANUFACTURER_MAP: Record<string, string> = {
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": "Governo Federal",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8": "Toyota Brasil",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC": "DETRAN SP",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906": "Oficina Central"
};

// Mapeamento de Códigos IBGE -> Localidades
export const LOCATION_MAP: Record<number, string> = {
    3550308: "São Paulo / SP",
    3304557: "Rio de Janeiro / RJ",
    3106200: "Belo Horizonte / MG",
    4106902: "Curitiba / PR",
    4314902: "Porto Alegre / RS",
    5300108: "Brasília / DF",
    2927408: "Salvador / BA",
    2304400: "Fortaleza / CE"
};

// Opções para Dropdowns no Front-end
export const LOCATION_OPTIONS = Object.entries(LOCATION_MAP).map(([id, name]) => ({
    id: Number(id),
    name
})).sort((a, b) => a.name.localeCompare(b.name));

export const getBrandName = (address: string) => {
    return MANUFACTURER_MAP[address] || `Montadora (..${address.slice(-4)})`;
};

export const getLocationName = (id: number) => {
    return LOCATION_MAP[id] || `Localidade #${id}`;
};

/**
 * Busca o nome do município dinamicamente via API do IBGE caso o ID não esteja no mapa local.
 */
export const resolveLocation = async (id: number): Promise<string> => {
    if (LOCATION_MAP[id]) return LOCATION_MAP[id];

    try {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${id}`);
        if (!response.ok) throw new Error("Cód. IBGE inválido");
        const data = await response.json();

        // O objeto Município do IBGE tem a UF aninhada em microrregiao -> mesorregiao
        const uf = data.microrregiao?.mesorregiao?.UF?.sigla || "??";
        const fullLocation = `${data.nome} / ${uf}`;

        // Cache opcional no mapa local (não persistente, apenas para esta sessão)
        LOCATION_MAP[id] = fullLocation;
        return fullLocation;
    } catch (err) {
        console.warn(`Não foi possível resolver o município ${id}:`, err);
        return `Localidade #${id}`;
    }
};

export const getBlockchainProvider = (): ethers.BrowserProvider | ethers.JsonRpcProvider => {
    // @ts-ignore
    if (window.ethereum) return new ethers.BrowserProvider(window.ethereum);
    return new ethers.JsonRpcProvider(RPC_FALLBACK);
}

export const connectWallet = async () => {
    // @ts-ignore
    if (!window.ethereum) {
        throw new Error("MetaMask não encontrado! Instale a extensão do MetaMask no navegador.");
    }

    try {
        // @ts-ignore
        const provider = new ethers.BrowserProvider(window.ethereum);

        // Pede para o usuário escolher uma conta ou conectar
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();

        // Checagem de Rede
        const network = await provider.getNetwork();
        console.log("Conectado na Chain ID:", network.chainId);

        if (network.chainId !== CHAIN_ID) {
            try {
                // @ts-ignore
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x' + CHAIN_ID.toString(16) }],
                });
            } catch (switchError: any) {
                if (switchError.code === 4902) {
                    alert(`Rede (chain ${CHAIN_ID}) não encontrada no MetaMask. Adicione-a manualmente.`);
                } else {
                    alert(`Por favor, troque manualmente para a rede correta no MetaMask (chain ${CHAIN_ID}).`);
                }
            }
        }

        return signer;
    } catch (err) {
        console.error("Erro na conexão da carteira:", err);
        throw err;
    }
}

// Usado apenas pelo botão "Conectar Carteira": força o MetaMask a reabrir o
// seletor de contas, mesmo que o site já tenha permissão para alguma conta.
// Sem isso, eth_requestAccounts simplesmente retorna a conta já autorizada
// sem nenhum feedback, impedindo o usuário de trocar de carteira pela UI.
// NÃO usar em chamadas internas de transação (connectWallet) — abriria o
// MetaMask repetidamente a cada ação no site.
export const switchWallet = async () => {
    // @ts-ignore
    if (!window.ethereum) {
        throw new Error("MetaMask não encontrado! Instale a extensão do MetaMask no navegador.");
    }

    try {
        // @ts-ignore
        await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }],
        });
    } catch (permError: any) {
        if (permError?.code === 4001) {
            throw new Error("Conexão cancelada pelo usuário.");
        }
    }

    return connectWallet();
}

export const hasRole = async (address: string, roleKey: keyof typeof ROLES) => {
    const provider = getBlockchainProvider();
    const contract = await getRegistroVeicularContract(provider);
    return await contract.hasRole(ROLES[roleKey], address);
}

export const checkUserRole = async (address: string) => {
    const provider = getBlockchainProvider();
    const contract = await getRegistroVeicularContract(provider);

    if (await contract.hasRole(ROLES.ADMIN, address)) return "Administrador";
    if (await contract.hasRole(ROLES.MANUFACTURER, address)) return "Montadora";
    if (await contract.hasRole(ROLES.DMV, address)) return "DETRAN";
    if (await contract.hasRole(ROLES.MECHANIC, address)) return "Oficina";
    if (await contract.hasRole(ROLES.INSURER, address)) return "Seguradora";
    if (await contract.hasRole(ROLES.DEALER, address)) return "Concessionária";

    return "Usuário";
}

export const getRegistroVeicularContract = async (signerOrProvider: ethers.Signer | ethers.Provider) => {
    return new ethers.Contract(CONTRACT_ADDRESS, RegistroVeicularArtifact.abi, signerOrProvider);
}

export const getAtorName = async (address: string): Promise<string> => {
    try {
        const provider = getBlockchainProvider();
        const contract = await getRegistroVeicularContract(provider);
        const ator = await contract.atores(address);
        return ator.nome || "Desconhecido";
    } catch (e) {
        return "Desconhecido";
    }
};

export const getTodosAtores = async (): Promise<any[]> => {
    try {
        const provider = getBlockchainProvider();
        const contract = await getRegistroVeicularContract(provider);
        const [enderecos, dados] = await contract.getTodosAtores();

        return enderecos.map((addr: string, i: number) => ({
            address: addr,
            nome: dados[i].nome,
            papel: Number(dados[i].papel),
            ativo: dados[i].ativo
        }));
    } catch (e) {
        console.error("Erro ao buscar atores", e);
        return [];
    }
};

export const registrarNovoAtor = async (signer: ethers.Signer, address: string, nome: string, papel: number, wmi: string = '') => {
    const contract = await getRegistroVeicularContract(signer);
    return await contract.registrarAtor(address, nome, papel, wmi);
};

export const revogarAtor = async (signer: ethers.Signer, address: string) => {
    const contract = await getRegistroVeicularContract(signer);
    return await contract.revogarAtor(address);
};
