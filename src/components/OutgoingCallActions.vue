<template>
  <div class="tw-flex tw-w-full tw-gap-1">
    <!-- Place Call Buttons -->
    <div class="tw-w-full">
      <lift-button
          v-if="dialing"
          title="Cancel Call"
          label="Cancel Call"
          color="danger"
          rounded="small"
          class="tw-w-full"
          @click="cancelCall"
      >
        <template #icon>
          <font-awesome-icon icon="fa-solid fa-phone-slash"/>
        </template>
      </lift-button>
      <lift-button
          v-else
          v-for="(phoneNumber, index) of phoneNumbers"
          :key="index"
          title="Place Call"
          :label="`Call ${phoneNumber.phoneNumber}`"
          color="secondary"
          rounded="small"
          class="tw-w-full tw-mt-1"
          @click="placeCall(phoneNumber.phoneNumber)"
      >
        <template #body>
          <p class="tw-font-bold tw-text-white"><font-awesome-icon icon="fa-solid fa-phone"/> Call {{phoneNumber.phoneNumber}}</p>
          <span class="tw-text-gray-200 tw-text-xs">{{phoneNumber.description}}</span>
        </template>
      </lift-button>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faPhone, faPhoneSlash } from "@fortawesome/free-solid-svg-icons";

library.add(faPhone, faPhoneSlash)

export default {
  name: "OutgoingCallActions",
  components: {
    FontAwesomeIcon
  },
  props: {
    phoneNumbers: {
      type: Array,
      required: true,
    },
  },
  emits: ["placeCall", "cancelCall"],
  data() {
    return {
      dialing: false,
    }
  },
  methods: {
    placeCall(phoneNumber) {
      this.$emit("placeCall", phoneNumber);
    },
    cancelCall() {
      this.$emit("cancelCall");
    },
  },
};
</script>