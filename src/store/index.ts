import { ActionTree, createStore } from "vuex";
import { Ether } from "../network";
import { utils, BigNumber } from "../const";
import { YENModel } from "yen-contract-sdk";
import { toRaw } from "vue";
import { ElMessage, ElNotification } from "element-plus";

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
    nextBlockMint: BigNumber;
    yourMinted: BigNumber;
    person: YENModel.Person;
    personBlockList: number[];
    block: { [blockNumber: string]: YENModel.Block };
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
      nextBlockMint: BigNumber.from(0),
      yourMinted: BigNumber.from(0),
      person: {
        blockIndex: BigNumber.from(0),
        stakes: BigNumber.from(0),
        rewards: BigNumber.from(0),
        lastPerStakeRewards: BigNumber.from(0),
      },
      personBlockList: [],
      block: {},
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

  async getMintData({ state, dispatch }, func: Function) {
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
        if (!state.async.mint.block[blockNumber]) {
          await dispatch("getBlock", blockNumber);
        }
        func();
      });
      func();
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
      if (!state.sync.ether.pair && pairAddress != utils.num.min) {
        toRaw(state.sync.ether).loadPair(pairAddress);
      }
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
    if (state.sync.ether.yen) {
      [
        state.async.table.totalSupply,
        state.async.table.halvingBlock,
        state.async.table.blockMints,
        state.async.table.burned,
      ] = await Promise.all([
        toRaw(state.sync.ether.yen).totalSupply(),
        toRaw(state.sync.ether.yen).halvingBlock(),
        toRaw(state.sync.ether.yen).blockMints(),
        toRaw(state.sync.ether.yen).balanceOf(utils.num.min),
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
      state.async.mint.block[blockNumber] = {
        persons: BigNumber.from(0),
        mints: BigNumber.from(0),
      };
      state.async.mint.block[blockNumber] = await toRaw(
        state.sync.ether.yen
      ).blockMap(blockNumber);
    }
  },

  async getBlockMint({ state }) {
    if (state.sync.ether.yen) {
      const [nextBlockMint, blockMints] = await Promise.all([
        toRaw(state.sync.ether.yen).getMints(),
        toRaw(state.sync.ether.yen).blockMints(),
      ]);
      state.async.mint.nextBlockMint = nextBlockMint.add(blockMints).div(2);
    }
  },

  async listenBlock({ state, dispatch }) {
    if (state.sync.ether.provider) {
      toRaw(state.sync.ether.provider).on("block", async (blockNumber) => {
        if (!state.async.mint.block[blockNumber]) {
          dispatch("getBlockMint");
          let start = state.sync.thisBlock;
          const blockList = Object.keys(state.async.mint.block);
          if (blockList.length > 0) {
            start = Number(blockList[blockList.length - 1]);
          }
          for (
            let runBlockNumber = start;
            runBlockNumber <= blockNumber;
            runBlockNumber++
          ) {
            if (!state.async.mint.block[runBlockNumber]) {
              await dispatch("getBlock", runBlockNumber);
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

  async showBlock({ state }, blockNumber: number) {
    if (
      state.async.mint.block[blockNumber].mints.gt(0) &&
      state.sync.ether.yen
    ) {
      const res = await toRaw(state.sync.ether.yen).getMintEventList(
        blockNumber,
        blockNumber
      );
      const title = `Block ${blockNumber} Minted`;
      let type: "success" | "warning" | "info" = "info";
      let msg = `${
        state.async.mint.block[blockNumber].persons
      } Person Share ${utils.format.bigToString(
        state.async.mint.block[blockNumber].mints,
        18
      )} YEN !`;
      res.forEach((e) => {
        if (e.person == state.sync.userAddress) {
          type = "success";
          msg =
            `You Minted ${utils.format.bigToString(
              state.async.mint.block[blockNumber].mints.div(
                state.async.mint.block[blockNumber].persons
              ),
              18
            )} YEN,` + msg;
        }
        msg = msg + `\n${e.person}`;
      });
      notification(title, msg, type);
    }
  },
};

export default createStore({
  state,
  actions,
});
