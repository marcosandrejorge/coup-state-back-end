new Vue({
    el: "#app-vue",
    data: {
        // socketId: null,
        hashSalaConectado: null,
        arrSalas: [],
        arrJogadoresSala: [],
        username: null,
    },

    computed: {
        isConectadoSala() {
            return this.hashSalaConectado !== null;
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
                this.arrJogadoresSala = arrJogadoresSala;
            });

            this.socketIO.on('salaConectada', hashSala => {
                this.hashSalaConectado = hashSala;
            });
        },

        criarSala() {

            if (this.username == null || this.username == "") {
                return false;
            }

            this.socketIO.emit('criarSala', {
                username: this.username
            });
        },

        entrarSala(hashSala) {
            if (this.username == null || this.username == "") {
                return false;
            }

            this.socketIO.emit('entrarSala', {
                hashSala: hashSala,
                username: this.username
            });
        },

        sairDaSala() {
            this.socketIO.emit('sairSala');
            this.hashSalaConectado = null;
        }
    },

    mounted() {
        this.setSocketIo();
    },
})