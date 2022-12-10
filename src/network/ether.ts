import { YENClient, ERC20Client, DeploymentInfo } from "yen-contract-sdk";
import detectEthereumProvider from "@metamask/detect-provider";
import { ethers, Signer, providers, Wallet } from "ethers";

export class Ether {
  public ethereum: any;

  public singer: Signer | undefined;

  public provider: providers.Web3Provider | undefined;

  public chainId: number | undefined;

  public yen: YENClient | undefined;

  public bot: YENClient | undefined;

  public pair: ERC20Client | undefined;

  public weth: ERC20Client | undefined;

  async load() {
    this.ethereum = (await detectEthereumProvider()) as any;
    if (this.ethereum) {
      this.ethereum.on("accountsChanged", () => {
        window.location.reload();
      });
      this.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
      await this.ethereum.request({ method: "eth_requestAccounts" });
      this.provider = new ethers.providers.Web3Provider(this.ethereum);
      this.singer = this.provider.getSigner();
      this.chainId = await this.singer.getChainId();
      if (DeploymentInfo[this.chainId]) {
        this.yen = new YENClient(
          this.singer,
          DeploymentInfo[this.chainId]["YEN"].proxyAddress
        );
        this.pair = new ERC20Client(this.singer, await this.yen.pair());
        this.weth = new ERC20Client(
          this.singer,
          "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        );
      } else {
        await this.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [
            {
              chainId: "0x1",
            },
          ],
        });
      }
    } else {
      throw "Please use a browser that supports web3 to open";
    }
  }

  async addToken(address: string) {
    if (this.ethereum) {
      await this.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: address,
            symbol: "YEN",
            decimals: 18,
            image: "https://yen.cool/favicon.png",
          },
        },
      });
    }
  }

  async loadBot(wallet: Wallet) {
    if (this.chainId && this.provider) {
      this.bot = new YENClient(
        wallet.connect(this.provider),
        DeploymentInfo[this.chainId]["YEN"].proxyAddress
      );
    }
  }
}
