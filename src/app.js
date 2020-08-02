new Vue({
    el: "#app-vue",
    data: {
        // socketId: null,
        idSalaConectado: null,
        arrSalas: [],
        arrJogadoresSala: [],
        username: null,
    },

    computed: {
        isConectadoSala() {
            return this.idSalaConectado !== null;
        }
    },

    methods: {

        setSocketIo() {
            this.socketIO = io('http://localhost:3000');

            // this.socketIO.on('socketId', socketId => {
            //     this.socketId = socketId;
            // });

            this.socketIO.on('salasAtualizadas', arrSalas => {
                this.arrSalas = arrSalas;
            });

            this.socketIO.on('jogadoresAtualizado', arrJogadoresSala => {
                this.arrJogadoresSala = arrJogadoresSala
            });

            this.socketIO.on('idSalaCriada', idSala => {
                this.idSalaConectado = idSala;
            });
        },

        criarSala() {
            this.socketIO.emit('criarSala', {
                username: this.username
            });
        }
    },

    mounted() {
        this.setSocketIo();
    },
})