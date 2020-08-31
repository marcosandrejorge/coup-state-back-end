const express = require('express');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, 'src')));
app.set('views', path.join(__dirname, 'src'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use('/', (req, res) => {
    res.render('index.html');
});

let arrSalas = [];
let arrJogadores = [];
let arrAcoesSala = [];
let arrCartasJogo = [];

function gerarHashSala() {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < 15; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function getHashSalaJogador(idJogador) {
    let sala = arrJogadores.find(jogador => {
        return jogador.idJogador == idJogador
    });

    return sala == null ? null : sala.hashSala;
}

function getObjSala(hashSala) {
    return arrSalas.find(sala => {
        return sala.hashSala == hashSala
    })
}

function getJogadoresDaSala(hashSala) {
    return arrJogadores.filter(jogador => {
        return jogador.hashSala == hashSala;
    })
}

function atualizarQuantidadeJogadores(hashSala) {
    arrSalas.map(sala => {
        if (sala.hashSala == hashSala) {
            sala.quantidadeJogadores = getJogadoresDaSala(hashSala).length
        }
    });

    io.emit('salasAtualizadas', arrSalas);
}

function getObjJogador(idJogador) {
    return arrJogadores.find(jogador => {
        return jogador.idJogador == idJogador
    })
}

io.on('connection', socket => {
    socket.emit('socketId', socket.id);
    io.emit('salasAtualizadas', arrSalas);

    function emitJogadores(hashSala) {
        // enviar para todos os clientes em uma sala específica
        atualizarQuantidadeJogadores(hashSala);
        io.in(hashSala).emit('jogadoresAtualizado', getJogadoresDaSala(hashSala));
        //Atualiza o jogador que está logado no socket.
        socket.emit('atualizarJogadorLogado', getObjJogador(socket.id))
    }

    //Função para adicionar no arrJogadores. Responsavel pelo controle para saber qual jogador está em qual sala.
    function adicionarJogadorESala(hashSala, idJogador, username) {
        arrJogadores.push({
            idJogador: idJogador,
            username: username,
            hashSala: hashSala,
            isBloqueadoJogar: true,
            isJogando: false,
            qtdMoedas: 0,
        });

        socket.join(hashSala);
        socket.emit('salaConectada', getObjSala(hashSala));
        emitJogadores(hashSala);
    }

    function removerJogadorSala(idJogador) {
        let index = null;
        let hashSala = null;

        arrJogadores.map((jogador, key) => {
            if (jogador.idJogador == idJogador) {
                index = key;
                hashSala = jogador.hashSala;
            }
        });

        if (index !== null) {

            socket.leave(getHashSalaJogador(idJogador));

            arrJogadores.splice(index, 1);
            // enviar para todos os clientes em uma sala específica
            alterarAdminDaSala(idJogador, hashSala);
            emitJogadores(hashSala);
        }
    };

    //Função que troca o admin da sala, cao o jogador que saiu for o admin da sala.
    function alterarAdminDaSala(idJogador) {
        let removerSala = false;
        let index = null;

        arrSalas.map((sala, key) => {
            if (sala.admin == idJogador) {
                let jogadores = getJogadoresDaSala(sala.hashSala);

                //Se não tem mais ninguém na sala, remove ela.
                removerSala = jogadores.length == 0;
                index = key;

                if (!removerSala) {
                    sala.admin = jogadores[0].idJogador;
                    sala.adminUserName = jogadores[0].username;
                }
            }
        });

        if (removerSala) {
            arrSalas.splice(index, 1);
        }

        io.emit('salasAtualizadas', arrSalas);
    }

    socket.on('criarSala', data => {
        //Entra com o usuário na sala selecionada;
        let hashSala = gerarHashSala();

        let objSala = {
            hashSala: hashSala,
            quantidadeJogadores: 1,
            isSalaIniciada: false,
            admin: socket.id,
            adminUserName: data.username
        };

        arrSalas.push(objSala);

        adicionarJogadorESala(hashSala, socket.id, data.username);

        io.emit('salasAtualizadas', arrSalas);
    });

    socket.on('entrarSala', data => {
        adicionarJogadorESala(data.hashSala, socket.id, data.username);
    });

    socket.on('sairSala', () => {
        removerJogadorSala(socket.id);
    });

    socket.on('disconnect', () => {
        removerJogadorSala(socket.id);
    });
});

server.listen(3000);