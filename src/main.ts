import { createApp } from "vue";
import App from "./App.vue";

// import "~/styles/element/index.scss";

// import ElementPlus from "element-plus";
// import all element css, uncommented next line
// import "element-plus/dist/index.css";

// or use cdn, uncomment cdn link in `index.html`

import "~/styles/index.scss";
import "uno.css";

// If you want to use ElNotification, import it.
import "element-plus/theme-chalk/src/notification.scss";
import "element-plus/theme-chalk/src/message.scss";

import store from "./store";

const app = createApp(App);

app.use(store);
// app.use(ElementPlus);
app.mount("#app");
