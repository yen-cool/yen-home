import { ActionTree, createStore } from "vuex";
import { Ether } from "../network";
import { utils, BigNumber } from "../const";
import { YENModel } from "yen-contract-sdk";
import { toRaw } from "vue";
import { ElMessage, ElNotification } from "element-plus";
import { Wallet } from "ethers";

export { YENModel } from "yen-contract-sdk";

export interface Storage {}

export interface Sync {
  userAddress: string;
  yenAddress: string;
  chainId: number;
  ether: Ether;
  thisBlock: number;
  thisTime: number;
}

export interface Async {
  mint: {
    lastGetTime: number;
    nextBlockMint: BigNumber;
    yourMinted: BigNumber;
    person: YENModel.Person;
    personBlockList: number[];
    blockMap: { [blockNumber: string]: YENModel.Block };
  };
  stake: {
    person: YENModel.Person;
    yourPairs: BigNumber;
    yourPairAllowance: BigNumber;
    yourReward: BigNumber;
    stakes: BigNumber;
  };
  table: {
    totalSupply: BigNumber;
    halvingBlock: BigNumber;
    blockMints: BigNumber;
    burned: BigNumber;
    YENPoolBalance: BigNumber;
    ETHPoolBalance: BigNumber;
  };
  bot: {
    wallet: Wallet | undefined;
    run: boolean;
    minMint: BigNumber;
    maxPriorityFeePerGas: BigNumber;
    maxFeePerGas: BigNumber;
    txMap: {
      [tx: string]: {
        status: string;
        fee?: BigNumber;
      };
    };
  };
}

export interface State {
  storage: Storage;
  sync: Sync;
  async: Async;
}

const state: State = {
  storage: {},
  sync: {
    userAddress: utils.num.min,
    yenAddress: utils.num.min,
    chainId: 0,
    ether: new Ether(),
    thisBlock: 0,
    thisTime: 0,
  },
  async: {
    mint: {
      lastGetTime: 0,
      nextBlockMint: BigNumber.from(0),
      yourMinted: BigNumber.from(0),
      person: {
        blockIndex: BigNumber.from(0),
        stakes: BigNumber.from(0),
        rewards: BigNumber.from(0),
        lastPerStakeRewards: BigNumber.from(0),
      },
      personBlockList: [],
      blockMap: {},
    },
    stake: {
      person: {
        blockIndex: BigNumber.from(0),
        stakes: BigNumber.from(0),
        rewards: BigNumber.from(0),
        lastPerStakeRewards: BigNumber.from(0),
      },
      stakes: BigNumber.from(0),
      yourPairs: BigNumber.from(0),
      yourPairAllowance: BigNumber.from(0),
      yourReward: BigNumber.from(0),
    },
    table: {
      totalSupply: BigNumber.from(0),
      halvingBlock: BigNumber.from(0),
      blockMints: BigNumber.from(0),
      burned: BigNumber.from(0),
      YENPoolBalance: BigNumber.from(0),
      ETHPoolBalance: BigNumber.from(0),
    },
    bot: {
      wallet: undefined,
      run: false,
      minMint: BigNumber.from(0),
      maxPriorityFeePerGas: BigNumber.from(0),
      maxFeePerGas: BigNumber.from(0),
      txMap: {},
    },
  },
};

function err(error: any) {
  ElMessage({
    message: error.toString().split("(")[0],
    duration: 3000,
    type: "error",
  });
}

function notification(
  title: string,
  message: string,
  type: "success" | "warning" | "info"
) {
  ElNotification({
    title,
    message,
    dangerouslyUseHTMLString: true,
    duration: 60000,
    offset: 50,
    type,
  });
}

const actions: ActionTree<State, State> = {
  async start({ dispatch }) {
    try {
      await dispatch("setSync");
      await dispatch("watchStorage");
      await dispatch("listenBlock");
      utils.func.log("app start success!");
    } catch (error) {
      err(error);
    }
  },

  async setSync({ state }) {
    await toRaw(state.sync.ether).load();
    if (state.sync.ether.singer && state.sync.ether.provider) {
      [state.sync.userAddress, state.sync.thisBlock] = await Promise.all([
        toRaw(state.sync.ether.singer).getAddress(),
        toRaw(state.sync.ether.provider).getBlockNumber(),
      ]);
      state.sync.thisTime = (
        await toRaw(state.sync.ether.provider).getBlock(state.sync.thisBlock)
      ).timestamp;
    }
    if (state.sync.ether.chainId) {
      state.sync.chainId = state.sync.ether.chainId;
    }
    if (state.sync.ether.yen) {
      state.sync.yenAddress = toRaw(state.sync.ether.yen).address();
    }
  },

  async watchStorage({ state }) {
    const storageName = `${state.sync.userAddress}_${state.sync.chainId}`;
    try {
      const storage = localStorage.getItem(storageName);
      if (storage) {
        utils.deep.clone(state.storage, JSON.parse(storage));
      } else {
        throw new Error("localStorage is empty!");
      }
    } catch (err) {
      localStorage.setItem(storageName, JSON.stringify(state.storage));
    }
    this.watch(
      (state) => state.storage,
      (storage) => {
        localStorage.setItem(storageName, JSON.stringify(storage));
      },
      {
        deep: true,
      }
    );
  },

  async getMintData({ state, dispatch }) {
    if (state.sync.ether.yen) {
      let personBlockList;
      [state.async.mint.yourMinted, state.async.mint.person, personBlockList] =
        await Promise.all([
          toRaw(state.sync.ether.yen).getClaims(state.sync.userAddress),
          toRaw(state.sync.ether.yen).personMap(state.sync.userAddress),
          toRaw(state.sync.ether.yen).getPersonBlockList(
            state.sync.userAddress
          ),
        ]);
      state.async.mint.personBlockList = [];
      for (let i = 0; i < Number(state.async.mint.person.blockIndex); i++) {
        state.async.mint.personBlockList.push(personBlockList[i]);
      }
      state.async.mint.personBlockList.reverse();
      state.async.mint.personBlockList.forEach(async (blockNumber) => {
        if (!state.async.mint.blockMap[blockNumber]) {
          await dispatch("getBlock", blockNumber);
        }
      });
    }
  },

  async getStakeData({ state }) {
    if (state.sync.ether.yen) {
      let pairAddress;
      [
        state.async.stake.person,
        state.async.stake.yourReward,
        pairAddress,
        state.async.stake.stakes,
      ] = await Promise.all([
        toRaw(state.sync.ether.yen).personMap(state.sync.userAddress),
        toRaw(state.sync.ether.yen).getRewards(state.sync.userAddress),
        toRaw(state.sync.ether.yen).pair(),
        toRaw(state.sync.ether.yen).stakes(),
      ]);
      if (state.sync.ether.pair) {
        state.async.stake.yourPairs = await toRaw(
          state.sync.ether.pair
        ).balanceOf(state.sync.userAddress);
        state.async.stake.yourPairAllowance = await toRaw(
          state.sync.ether.pair
        ).allowance(
          state.sync.userAddress,
          toRaw(state.sync.ether.yen).address()
        );
      }
    }
  },

  async getTableData({ state }) {
    if (state.sync.ether.yen && state.sync.ether.weth) {
      let pairAddress;
      [
        state.async.table.totalSupply,
        state.async.table.halvingBlock,
        state.async.table.blockMints,
        state.async.table.burned,
        pairAddress,
      ] = await Promise.all([
        toRaw(state.sync.ether.yen).totalSupply(),
        toRaw(state.sync.ether.yen).halvingBlock(),
        toRaw(state.sync.ether.yen).blockMints(),
        toRaw(state.sync.ether.yen).balanceOf(utils.num.min),
        toRaw(state.sync.ether.yen).pair(),
      ]);
      [state.async.table.YENPoolBalance, state.async.table.ETHPoolBalance] =
        await Promise.all([
          toRaw(state.sync.ether.yen).balanceOf(pairAddress),
          toRaw(state.sync.ether.weth).balanceOf(pairAddress),
        ]);
    }
  },

  async mint({ state }, func: Function) {
    if (state.sync.ether.yen) {
      try {
        await toRaw(state.sync.ether.yen).mint({}, func);
      } catch (error) {
        err(error);
        func(null);
      }
    }
  },

  async claim({ state }, func: Function) {
    if (state.sync.ether.yen) {
      try {
        await toRaw(state.sync.ether.yen).claim({}, func);
      } catch (error) {
        err(error);
        func(null);
      }
    }
  },

  async approve({ state }, func: Function) {
    if (state.sync.ether.pair && state.sync.ether.yen) {
      try {
        await toRaw(state.sync.ether.pair).approve(
          toRaw(state.sync.ether.yen).address(),
          BigNumber.from(utils.num.max),
          {},
          func
        );
      } catch (error) {
        err(error);
        func(null);
      }
    }
  },

  async stake({ state }, { stakes, func }) {
    if (state.sync.ether.yen) {
      try {
        await toRaw(state.sync.ether.yen).stake(stakes, {}, func);
      } catch (error) {
        err(error);
        func(null);
      }
    }
  },

  async withdrawStake({ state }, { withdrawStakes, func }) {
    if (state.sync.ether.yen) {
      try {
        await toRaw(state.sync.ether.yen).withdrawStake(
          withdrawStakes,
          {},
          func
        );
      } catch (error) {
        err(error);
        func(null);
      }
    }
  },

  async withdrawReward({ state }, func: Function) {
    if (state.sync.ether.yen) {
      try {
        await toRaw(state.sync.ether.yen).withdrawReward({}, func);
      } catch (error) {
        err(error);
        func(null);
      }
    }
  },

  async exit({ state }, func: Function) {
    if (state.sync.ether.yen) {
      try {
        await toRaw(state.sync.ether.yen).exit({}, func);
      } catch (error) {
        err(error);
        func(null);
      }
    }
  },

  async getBlock({ state }, blockNumber: number) {
    if (state.sync.ether.yen) {
      state.async.mint.blockMap[blockNumber] = {
        persons: BigNumber.from(0),
        mints: BigNumber.from(0),
      };
      state.async.mint.blockMap[blockNumber] = await toRaw(
        state.sync.ether.yen
      ).blockMap(blockNumber);
    }
  },

  async getBlockMint({ state, dispatch }) {
    if (
      state.sync.ether.yen &&
      new Date().getTime() - state.async.mint.lastGetTime > 1000
    ) {
      state.async.mint.lastGetTime = new Date().getTime();
      const [nextBlockMint, blockMints] = await Promise.all([
        toRaw(state.sync.ether.yen).getMints(),
        toRaw(state.sync.ether.yen).blockMints(),
      ]);
      state.async.mint.nextBlockMint = nextBlockMint.add(blockMints).div(2);
      dispatch("doBot");
    }
  },

  async listenBlock({ state, dispatch }) {
    if (state.sync.ether.provider) {
      toRaw(state.sync.ether.provider).on("block", async (blockNumber) => {
        if (!state.async.mint.blockMap[blockNumber]) {
          dispatch("getBlockMint", blockNumber);
          let start = state.sync.thisBlock;
          const blockList = Object.keys(state.async.mint.blockMap);
          if (blockList.length > 0) {
            start = Number(blockList[blockList.length - 1]);
          }
          for (
            let runBlockNumber = start;
            runBlockNumber <= blockNumber;
            runBlockNumber++
          ) {
            if (!state.async.mint.blockMap[runBlockNumber]) {
              await dispatch("getBlock", runBlockNumber);
              await dispatch("showMint", runBlockNumber);
            }
          }
        }
      });
    }
  },

  async addToken({ state }) {
    if (state.sync.ether) {
      await state.sync.ether.addToken(state.sync.yenAddress);
    }
  },

  async showMint({ state }, blockNumber: number) {
    if (
      state.async.mint.blockMap[blockNumber].mints.gt(0) &&
      state.sync.ether.yen
    ) {
      const res = await toRaw(state.sync.ether.yen).getMintEventList(
        blockNumber,
        blockNumber
      );
      const title = `Block ${blockNumber} Minted`;
      let type: "success" | "warning" | "info" = "info";
      let msg = `<div> ${
        state.async.mint.blockMap[blockNumber].persons
      } Person Share ${utils.format.bigToString(
        state.async.mint.blockMap[blockNumber].mints,
        18
      )} YEN </div>`;
      res.forEach((e) => {
        if (e.person == state.sync.userAddress) {
          type = "success";
          msg =
            `<div> You Minted ${utils.format.bigToString(
              state.async.mint.blockMap[blockNumber].mints.div(
                state.async.mint.blockMap[blockNumber].persons
              ),
              18
            )} YEN </div>` + msg;
        }
        msg =
          msg +
          `<a href="${utils.url.tx(
            state.sync.chainId,
            e.msg.transactionHash
          )}" target="_blank"> ${utils.format.string2(e.person, 8)} </a>`;
      });
      notification(title, msg, type);
    }
  },

  async addPrivateKey({ state }, privateKey: string) {
    state.async.bot.wallet = new Wallet(privateKey);
    await toRaw(state.sync.ether).loadBot(state.async.bot.wallet);
  },

  async runBot({ state }, { minMint, maxPriorityFeePerGas, maxFeePerGas }) {
    state.async.bot.run = true;
    state.async.bot.minMint = minMint;
    state.async.bot.maxPriorityFeePerGas = maxPriorityFeePerGas;
    state.async.bot.maxFeePerGas = maxFeePerGas;
  },

  async stopBot({ state }) {
    state.async.bot.run = false;
  },

  async doBot({ state }) {
    if (
      state.async.bot.run &&
      state.async.mint.nextBlockMint.gte(state.async.bot.minMint)
    ) {
      let have = false;
      Object.values(state.async.bot.txMap).forEach((e) => {
        if (e.status == "pending") {
          have = true;
        }
      });
      if (!have) {
        if (state.sync.ether.bot) {
          toRaw(state.sync.ether.bot).mint(
            {
              maxFeePerGas: state.async.bot.maxFeePerGas,
              maxPriorityFeePerGas: state.async.bot.maxPriorityFeePerGas,
            },
            (
              e: YENModel.ContractTransaction | YENModel.ContractReceipt | any
            ) => {
              if (e.hash) {
                state.async.bot.txMap[e.hash] = {
                  status: "pending",
                };
              } else if (e.transactionHash) {
                state.async.bot.txMap[e.transactionHash].status = "success";
                state.async.bot.txMap[e.transactionHash].fee =
                  e.effectiveGasPrice.mul(e.gasUsed);
              }
            }
          );
        }
      }
    }
  },
};

export default createStore({
  state,
  actions,
});
