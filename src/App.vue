<template>
  <el-config-provider namespace="ep">
    <el-menu
      :default-active="activeIndex"
      mode="horizontal"
      :ellipsis="false"
      @select="handleSelect"
    >
      <el-menu-item index="1" class="item"> YEN </el-menu-item>
      <el-menu-item index="2" class="item"> Mint </el-menu-item>
      <el-menu-item index="3" class="item"> Stake </el-menu-item>
      <el-menu-item index="4" class="item"> Table </el-menu-item>
      <el-menu-item index="5" class="item"> Bot </el-menu-item>
      <el-menu-item index="-1" class="item" @click="toggleDark()">
        <button
          class="border-none w-full bg-transparent cursor-pointer"
          style="height: var(--ep-menu-item-height)"
        >
          <i inline-flex i="dark:ep-moon ep-sunny" />
        </button>
      </el-menu-item>
      <div class="flex-grow" />
      <el-menu-item index="-2" class="item2">
        {{ utils.format.string2(state.sync.userAddress, 8) }}
      </el-menu-item>
    </el-menu>
    <div>
      <Home v-if="activeIndex == '1'"></Home>
      <Mint v-if="activeIndex == '2'"></Mint>
      <Stake v-if="activeIndex == '3'"></Stake>
      <Table v-if="activeIndex == '4'"></Table>
      <Bot v-if="activeIndex == '5'"></Bot>
    </div>
  </el-config-provider>
</template>

<script lang="ts">
import { useDark, useToggle } from "@vueuse/core";
import { utils } from "./const";
import { mapState, mapActions } from "vuex";
import { State } from "./store";

export default {
  data() {
    return {
      utils,
      activeIndex: "1",
      toggleDark: useToggle(useDark()),
    };
  },
  created() {
    window.addEventListener("load", async () => {
      utils.func.log("window load");
      await this.start();
    });
  },
  computed: mapState({
    state: (state: any) => state as State,
  }),
  methods: {
    ...mapActions(["start"]),
    handleSelect(key: string) {
      if (Number(key) > 0) {
        (this as any).activeIndex = key;
      }
    },
  },
};
</script>

<style>
#app {
  text-align: center;
  color: var(--ep-text-color-primary);
}

.item {
  width: 7%;
}

.item2 {
  width: 15%;
}

.flex-grow {
  flex-grow: 1;
}
</style>
