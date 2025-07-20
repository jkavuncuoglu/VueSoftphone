<template>
  <div v-if="visible" class="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50">
    <div class="tw-bg-white tw-rounded-md tw-shadow-lg tw-max-w-md tw-w-full tw-mx-4">
      <div class="tw-flex tw-justify-between tw-items-center tw-border-b tw-border-gray-200 tw-p-4">
        <h3 class="tw-text-lg tw-font-medium tw-text-gray-900">
          {{ allPassed ? 'System Check Passed' : 'System Check Failed' }}
        </h3>
        <button 
          v-if="dismissible"
          @click="closeModal" 
          class="tw-text-gray-400 hover:tw-text-gray-500 focus:tw-outline-none"
        >
          <font-awesome-icon icon="fa-solid fa-times" />
        </button>
      </div>
      
      <div class="tw-p-4 tw-max-h-96 tw-overflow-y-auto">
        <!-- All tests passed message -->
        <div v-if="allPassed" class="tw-text-center tw-py-4">
          <div class="tw-mx-auto tw-flex tw-items-center tw-justify-center tw-h-12 tw-w-12 tw-rounded-full tw-bg-green-100 tw-mb-4">
            <font-awesome-icon icon="fa-solid fa-check" class="tw-h-6 tw-w-6 tw-text-green-600" />
          </div>
          <h3 class="tw-text-lg tw-font-medium tw-text-gray-900">All System Checks Passed</h3>
          <p class="tw-mt-2 tw-text-sm tw-text-gray-500">
            Your system is ready to make and receive calls.
          </p>
        </div>
        
        <!-- Failed tests -->
        <div v-else>
          <div class="tw-mx-auto tw-flex tw-items-center tw-justify-center tw-h-12 tw-w-12 tw-rounded-full tw-bg-red-100 tw-mb-4">
            <font-awesome-icon icon="fa-solid fa-exclamation-triangle" class="tw-h-6 tw-w-6 tw-text-red-600" />
          </div>
          <h3 class="tw-text-lg tw-font-medium tw-text-center tw-text-gray-900 tw-mb-4">System Check Issues Detected</h3>
          
          <div v-for="(test, index) in failedTests" :key="index" class="tw-mb-4 tw-border-b tw-border-gray-200 tw-pb-4">
            <div class="tw-flex tw-items-start">
              <div class="tw-flex-shrink-0">
                <font-awesome-icon icon="fa-solid fa-times-circle" class="tw-h-5 tw-w-5 tw-text-red-500" />
              </div>
              <div class="tw-ml-3">
                <h4 class="tw-text-sm tw-font-medium tw-text-gray-900">{{ test.test }}</h4>
                <p class="tw-mt-1 tw-text-sm tw-text-gray-500">{{ test.message }}</p>
                
                <div v-if="test.solution" class="tw-mt-2 tw-bg-yellow-50 tw-border-l-4 tw-border-yellow-400 tw-p-3">
                  <div class="tw-flex">
                    <div class="tw-flex-shrink-0">
                      <font-awesome-icon icon="fa-solid fa-lightbulb" class="tw-h-5 tw-w-5 tw-text-yellow-400" />
                    </div>
                    <div class="tw-ml-3">
                      <p class="tw-text-sm tw-text-yellow-700">
                        <span class="tw-font-medium tw-text-yellow-700">Suggested Solution:</span> {{ test.solution }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Contact administrator message -->
          <div class="tw-mt-6 tw-bg-blue-50 tw-border-l-4 tw-border-blue-400 tw-p-4">
            <div class="tw-flex">
              <div class="tw-flex-shrink-0">
                <font-awesome-icon icon="fa-solid fa-info-circle" class="tw-h-5 tw-w-5 tw-text-blue-400" />
              </div>
              <div class="tw-ml-3">
                <p class="tw-text-sm tw-text-blue-700">
                  If you're unable to resolve these issues, please contact your system administrator for assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="tw-bg-gray-50 tw-px-4 tw-py-3 tw-flex tw-justify-end tw-border-t tw-border-gray-200">
        <button
          v-if="dismissible"
          @click="closeModal"
          class="tw-bg-gray-500 hover:tw-bg-gray-600 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-transition-colors"
        >
          {{ allPassed ? 'Continue' : 'Dismiss' }}
        </button>
        <button
          v-else
          @click="retryTests"
          class="tw-bg-blue-600 hover:tw-bg-blue-700 tw-text-white tw-font-bold tw-py-2 tw-px-4 tw-rounded-sm tw-transition-colors"
        >
          Retry Tests
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { 
  faTimes, 
  faCheck, 
  faExclamationTriangle, 
  faTimesCircle, 
  faLightbulb, 
  faInfoCircle 
} from "@fortawesome/free-solid-svg-icons";

library.add(
  faTimes, 
  faCheck, 
  faExclamationTriangle, 
  faTimesCircle, 
  faLightbulb, 
  faInfoCircle
);

/**
 * DiagnosticsModal Component
 * 
 * This component displays the results of system diagnostic tests.
 * It shows which tests failed, provides solutions for each issue,
 * and includes a message to contact the administrator if the user
 * can't resolve the issues themselves.
 */
export default {
  name: "DiagnosticsModal",
  components: {
    FontAwesomeIcon
  },
  props: {
    /**
     * Whether the modal is visible
     */
    visible: {
      type: Boolean,
      default: false
    },
    /**
     * Whether all tests passed
     */
    allPassed: {
      type: Boolean,
      default: false
    },
    /**
     * Array of failed tests
     * Each test should have: { test: string, message: string, solution: string }
     */
    failedTests: {
      type: Array,
      default: () => []
    },
    /**
     * Whether the modal can be dismissed
     * If false, only a "Retry" button will be shown
     */
    dismissible: {
      type: Boolean,
      default: true
    }
  },
  emits: ["close", "retry"],
  methods: {
    /**
     * Close the modal
     */
    closeModal() {
      this.$emit("close");
    },
    /**
     * Retry the tests
     */
    retryTests() {
      this.$emit("retry");
    }
  }
};
</script>