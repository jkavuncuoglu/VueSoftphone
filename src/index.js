import Softphone from './components/Softphone.vue'
import './assets/tailwind.css'

export default {
    install: (Vue) => {
        Vue.component('Softphone', Softphone)
    }
}

export { Softphone }