<template>
  <div>
    <el-card class="box-card">
      <el-form label-width="30%">
        <el-form-item label="Next Block Mint:">
          <div>
            {{
              `${utils.format.bigToString(
                state.async.mint.nextBlockMint,
                18
              )} YEN (Block Miners Share) `
            }}
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="doMint()" :loading="mintLoad"
            >Mint</el-button
          >
        </el-form-item>
      </el-form>

      <el-divider />
      <el-form label-width="30%">
        <el-form-item label="Minted :">
          <div>
            {{
              `${utils.format.bigToString(state.async.mint.yourMinted, 18)} YEN`
            }}
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="doClaim()" :loading="claimLoad"
            >Claim</el-button
          >
        </el-form-item>
      </el-form>

      <el-divider />
      <el-form label-width="30%">
        <el-table :data="mintedList" stripe height="300" style="width: 100%">
          <el-table-column prop="block" label="Block" width="150" />
          <el-table-column prop="minted" label="Your Minted" width="200" />
          <el-table-column prop="person" label="Person" width="150" />
          <el-table-column prop="total" label="Total Minted" />
        </el-table>
      </el-form>
    </el-card>
  </div>
</template>

<script lang="ts">
import { utils } from "../const";
import { mapState, mapActions } from "vuex";
import { State, YENModel } from "../store";

export default {
  data() {
    return {
      utils: utils,
      mintDialogText: "",
      mintLoad: false,
      claimLoad: false,
      mintedList: [],
    };
  },
  async created() {
    await this.getMintData();
    this.getMintedData();
  },
  computed: mapState({
    state: (state: any) => state as State,
  }),
  watch: {
    "state.async.mint.blockMap": {
      handler: async function () {
        await this.getMintedData();
      },
      deep: true,
    },
  },
  methods: {
    ...mapActions(["getMintData", "mint", "claim"]),
    async getMintedData() {
      const mintedList: {
        block: number;
        minted: string;
        person: number;
        total: string;
      }[] = [];
      this.state.async.mint.personBlockList.forEach((blockNumber) => {
        if (
          this.state.async.mint.blockMap[blockNumber] &&
          !this.state.async.mint.blockMap[blockNumber].mints.eq(0)
        ) {
          mintedList.push({
            block: blockNumber,
            minted: `${utils.format.bigToString(
              this.state.async.mint.blockMap[blockNumber].mints.div(
                this.state.async.mint.blockMap[blockNumber].persons
              ),
              18
            )} YEN`,
            person: Number(this.state.async.mint.blockMap[blockNumber].persons),
            total: `${utils.format.bigToString(
              this.state.async.mint.blockMap[blockNumber].mints,
              18
            )} YEN`,
          });
        }
      });
      this.mintedList = mintedList as any;
    },
    async doMint() {
      this.mintLoad = true;
      await this.mint(
        async (
          e: YENModel.ContractTransaction | YENModel.ContractReceipt | null
        ) => {
          if (!e) {
            this.mintLoad = false;
          } else if (e.blockNumber) {
            this.mintLoad = false;
            await this.getMintData();
          }
        }
      );
    },
    async doClaim() {
      this.claimLoad = true;
      await this.claim(
        async (
          e: YENModel.ContractTransaction | YENModel.ContractReceipt | null
        ) => {
          if (!e) {
            this.claimLoad = false;
          } else if (e.blockNumber) {
            this.claimLoad = false;
            await this.getMintData();
          }
        }
      );
    },
  },
};
</script>

<style>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.box-card {
  width: 700px;
  margin-left: auto;
  margin-right: auto;
}

.infinite-list {
  height: 300px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.infinite-list .infinite-list-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  background: rgb(216, 233, 253);
  margin: 10px;
  color: rgb(20, 122, 246);
}
.infinite-list .infinite-list-item + .list-item {
  margin-top: 10px;
}
</style>
