<template>
  <div>
    <el-card class="box-card">
      <el-form label-width="30%">
        <el-form-item label="Your Pairs :">
          <div>
            {{
              `${utils.format.bigToString(
                state.async.stake.yourPairs,
                18
              )} Pair`
            }}
          </div>
        </el-form-item>
        <el-form-item>
          <a
            target="_blank"
            :href="`https://app.uniswap.org/#/add/v2/ETH/${state.sync.yenAddress}`"
          >
            Add Liquidity
          </a>
        </el-form-item>
        <el-form-item label="stake :">
          <el-input v-model="stakes" type="string">
            <template #append
              ><el-button
                type="primary"
                @click="
                  stakes = utils.format.bigToString(
                    state.async.stake.yourPairs,
                    18
                  )
                "
                >max</el-button
              ></template
            >
          </el-input>
        </el-form-item>
        <el-form-item v-if="state.async.stake.yourPairAllowance.eq(0)">
          <el-button type="primary" @click="doApprove()" :loading="approveLoad"
            >Approve</el-button
          >
        </el-form-item>
        <el-form-item v-else>
          <el-button type="primary" @click="doStake()" :loading="stakeLoad"
            >Stake</el-button
          >
        </el-form-item>
      </el-form>

      <el-divider />
      <el-form label-width="30%">
        <el-form-item label="Total Stake :">
          <div>
            {{
              `${utils.format.bigToString(state.async.stake.stakes, 18)} Pair`
            }}
          </div>
        </el-form-item>
        <el-form-item label="Your Stake :">
          <div>
            {{
              `${utils.format.bigToString(
                state.async.stake.person.stakes,
                18
              )} Pair`
            }}
          </div>
        </el-form-item>
        <el-form-item label="withdrawStake :">
          <el-input v-model="withdrawStakes" type="string">
            <template #append
              ><el-button
                type="primary"
                @click="
                  withdrawStakes = utils.format.bigToString(
                    state.async.stake.person.stakes,
                    18
                  )
                "
                >max</el-button
              ></template
            >
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            @click="doWithdrawStake()"
            :loading="withdrawStakeLoad"
            >WithdrawStake</el-button
          >
        </el-form-item>
      </el-form>

      <el-divider />
      <el-form label-width="30%">
        <el-form-item label="Your Reward :">
          <div>
            {{
              `${utils.format.bigToString(
                state.async.stake.yourReward,
                18
              )} YEN`
            }}
          </div>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            @click="doWithdrawReward()"
            :loading="withdrawRewardLoad"
            >WithdrawReward</el-button
          >
        </el-form-item>
      </el-form>

      <el-divider />
      <el-form label-width="30%">
        <el-form-item>
          <el-button type="primary" @click="doExit()" :loading="exitLoad"
            >Exit</el-button
          >
        </el-form-item>
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
      stakes: "0",
      withdrawStakes: "0",
      utils: utils,
      approveLoad: false,
      stakeLoad: false,
      withdrawStakeLoad: false,
      withdrawRewardLoad: false,
      exitLoad: false,
    };
  },
  async created() {
    await this.getStakeData();
  },
  computed: mapState({
    state: (state: any) => state as State,
  }),
  methods: {
    ...mapActions([
      "getStakeData",
      "approve",
      "stake",
      "withdrawStake",
      "withdrawReward",
      "exit",
    ]),
    async doApprove() {
      this.approveLoad = true;
      await this.approve(
        async (
          e: YENModel.ContractTransaction | YENModel.ContractReceipt | null
        ) => {
          if (!e) {
            this.approveLoad = false;
          } else if (e.blockNumber) {
            this.approveLoad = false;
            await this.getStakeData();
          }
        }
      );
    },
    async doStake() {
      this.stakeLoad = true;
      await this.stake({
        stakes: utils.format.stringToBig(this.stakes, 18),
        func: async (
          e: YENModel.ContractTransaction | YENModel.ContractReceipt | null
        ) => {
          if (!e) {
            this.stakeLoad = false;
          } else if (e.blockNumber) {
            this.stakeLoad = false;
            await this.getStakeData();
          }
        },
      });
    },
    async doWithdrawStake() {
      this.withdrawStakeLoad = true;
      await this.withdrawStake({
        withdrawStakes: utils.format.stringToBig(this.withdrawStakes, 18),
        func: async (
          e: YENModel.ContractTransaction | YENModel.ContractReceipt | null
        ) => {
          if (!e) {
            this.withdrawStakeLoad = false;
          } else if (e.blockNumber) {
            this.withdrawStakeLoad = false;
            await this.getStakeData();
          }
        },
      });
    },
    async doWithdrawReward() {
      this.withdrawRewardLoad = true;
      await this.withdrawReward(
        async (
          e: YENModel.ContractTransaction | YENModel.ContractReceipt | null
        ) => {
          if (!e) {
            this.withdrawRewardLoad = false;
          } else if (e.blockNumber) {
            this.withdrawRewardLoad = false;
            await this.getStakeData();
          }
        }
      );
    },
    async doExit() {
      this.exitLoad = true;
      await this.exit(
        async (
          e: YENModel.ContractTransaction | YENModel.ContractReceipt | null
        ) => {
          if (!e) {
            this.exitLoad = false;
          } else if (e.blockNumber) {
            this.exitLoad = false;
            await this.getStakeData();
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
</style>
