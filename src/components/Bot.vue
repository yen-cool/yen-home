<template>
  <div>
    <el-card class="box-card">
      <el-form label-width="30%">
        <el-form-item label="Wallet Address :">
          <el-button
            type="primary"
            @click="dialogVisible = true"
            v-if="!state.async.bot.wallet"
            >Add PrivateKey</el-button
          >
          <div v-else>{{ state.async.bot.wallet.address }}</div>
        </el-form-item>
        <el-form-item label="minMint :">
          <el-input
            v-model="minMint"
            type="string"
            :disabled="state.async.bot.run"
          >
            <template #append> YEN </template></el-input
          >
        </el-form-item>
        <el-form-item label="MaxFeePerGas :">
          <el-input
            v-model="maxFeePerGas"
            type="string"
            :disabled="state.async.bot.run"
          >
            <template #append> Gwei </template>
          </el-input>
        </el-form-item>
        <el-form-item label="MaxPriorityFeePerGas :">
          <el-input
            v-model="maxPriorityFeePerGas"
            type="string"
            :disabled="state.async.bot.run"
          >
            <template #append> Gwei </template></el-input
          >
        </el-form-item>
        <el-form-item label="Change State :">
          <el-button
            type="primary"
            @click="start"
            v-if="!state.async.bot.run"
            :disabled="state.async.bot.wallet == undefined"
            >Start</el-button
          >
          <el-button type="primary" @click="stop" v-else>Stop</el-button>
        </el-form-item>
      </el-form>
      <el-divider />
      <el-form label-width="30%">
        <el-table :data="botList" stripe height="300" style="width: 100%">
          <el-table-column
            prop="transactionHash"
            label="TransactionHash"
            width="300"
          />
          <el-table-column prop="fee" label="Fee" width="200" />
          <el-table-column prop="status" label="Status" />
        </el-table>
      </el-form>
    </el-card>

    <el-dialog v-model="dialogVisible" title="Add PrivateKey" width="30%">
      <div>The system does not save the private key,</div>
      <div>Please keep the robot private key by yourself.</div>
      <el-input v-model="privateKey" placeholder="privateKey"> </el-input>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="confirm"> Confirm </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { utils } from "../const";
import { mapState, mapActions } from "vuex";
import { State } from "../store";

export default {
  data() {
    return {
      utils: utils,
      maxFeePerGas: "30",
      maxPriorityFeePerGas: "1",
      minMint: "100",
      dialogVisible: false,
      privateKey: "",
      botList: [],
    };
  },
  async created() {
    if (this.state.async.bot.maxFeePerGas.gt(0)) {
      this.maxFeePerGas = utils.format.bigToString(
        this.state.async.bot.maxFeePerGas,
        9
      );
      this.maxPriorityFeePerGas = utils.format.bigToString(
        this.state.async.bot.maxPriorityFeePerGas,
        9
      );
      this.minMint = utils.format.bigToString(this.state.async.bot.minMint, 18);
    }
    this.setBotList();
  },
  computed: mapState({
    state: (state: any) => state as State,
  }),
  watch: {
    "state.async.bot.txMap": {
      handler: async function () {
        await this.setBotList();
      },
      deep: true,
    },
  },
  methods: {
    ...mapActions(["addPrivateKey", "runBot", "stopBot"]),
    async setBotList() {
      const botList: {
        transactionHash: string;
        status: string;
        fee: string;
      }[] = [];
      Object.keys(this.state.async.bot.txMap).forEach((transactionHash) => {
        botList.push({
          transactionHash,
          fee: utils.format.bigToString(
            this.state.async.bot.txMap[transactionHash].fee,
            18
          ),
          status: this.state.async.bot.txMap[transactionHash].status,
        });
      });
      botList.reverse();
      this.botList = botList as any;
    },
    async confirm() {
      this.dialogVisible = false;
      await this.addPrivateKey(this.privateKey);
      this.privateKey = "";
    },
    async start() {
      if (this.state.async.bot.wallet) {
        await this.runBot({
          minMint: utils.format.stringToBig(this.minMint, 18),
          maxPriorityFeePerGas: utils.format.stringToBig(
            this.maxPriorityFeePerGas,
            9
          ),
          maxFeePerGas: utils.format.stringToBig(this.maxFeePerGas, 9),
        });
      }
    },
    async stop() {
      await this.stopBot();
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
