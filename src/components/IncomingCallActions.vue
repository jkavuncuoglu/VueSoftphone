<template>
  <div class="tw-flex tw-w-full tw-gap-1">
    <!-- Accept Call Button -->
    <lift-button
        title="Accept Call"
        label="Accept Call"
        color="secondary"
        rounded="small"
        class="tw-w-full"
        @click="acceptCall"
    >
      <template #icon>
        <font-awesome-icon icon="fa-solid fa-phone-volume" />
      </template>
    </lift-button>

    <!-- Decline Call Button -->
    <lift-button
        title="Decline Call"
        label="Decline Call"
        color="danger"
        rounded="small"
        class="tw-w-full"
        @click="declineCall"
    >
      <template #icon>
        <font-awesome-icon icon="fa-solid fa-phone-slash" />
      </template>
    </lift-button>
  </div>
</template>

<script>
export default {
  name: "IncomingCallActions",
  emits: ["acceptCall", "declineCall"],
  methods: {
    acceptCall() {
      this.$emit("acceptCall");
    },
    declineCall() {
      this.$emit("declineCall");
    },
  },
};
</script>