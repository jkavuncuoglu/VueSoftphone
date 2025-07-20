import { App } from 'vue'
import Softphone from './components/Softphone.vue'

export default {
    install: (app: App) => {
        app.component('Softphone', Softphone)
    }
}

export { Softphone }