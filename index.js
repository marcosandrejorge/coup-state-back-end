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
let arrJogadoresESala = [];

function gerarIdSala() {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < 15; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function getSalaJogador(idJogador) {
    let sala = arrJogadoresESala.find(jogador => {
        return jogador.idJogador == idJogador
    });

    return sala == null ? null : sala.idSala;
}

function getJogadoresDaSala(idSala) {
    return arrJogadoresESala.filter(sala => {
        return sala.idSala == idSala;
    })
}

io.on('connection', socket => {
    socket.emit('socketId', socket.id);
    io.emit('salasAtualizadas', arrSalas);

    //Função para adicionar no arrJogadoresESala. Responsavel pelo controle para saber qual jogador está em qual sala.
    function adicionarJogadorESala(idSala, idJogador, username) {
        arrJogadoresESala.push({
            idJogador: idJogador,
            username: username,
            idSala: idSala
        });

        socket.join(idSala);

        // enviar para todos os clientes em uma sala específica
        io.in(idSala).emit('jogadoresAtualizado', getJogadoresDaSala(idSala));
    }

    function removerJogadorSala(idJogador) {
        let index = null;
        let idSala = null;

        arrJogadoresESala.map((jogador, key) => {
            if (jogador.idJogador == idJogador) {
                index = key;
                idSala = jogador.idSala;
            }
        });

        if (index !== null) {
            
            socket.leave(getSalaJogador(idJogador));

            arrJogadoresESala.splice(index, 1);
            // enviar para todos os clientes em uma sala específica
            io.in(idSala).emit('jogadoresAtualizado', getJogadoresDaSala(idSala));
            alterarAdminDaSala(idJogador, idSala);
        }
    };

    //Função que troca o admin da sala, cao o jogador que saiu for o admin da sala.
    function alterarAdminDaSala(idJogador) {
        let removerSala = false;
        let index = null;

        arrSalas.map((sala, key) => {
            if (sala.admin == idJogador) {
                let jogadores = getJogadoresDaSala(sala.idSala);

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
        let idSala = gerarIdSala();

        let objSala = {
            idSala: idSala,
            quantidadeJogadores: 1,
            isSalaIniciada: false,
            admin: socket.id,
            adminUserName: data.username
        };

        arrSalas.push(objSala);

        adicionarJogadorESala(idSala, socket.id, data.username);

        io.emit('salasAtualizadas', arrSalas);
        socket.emit('salaConectada', idSala);
    });

    socket.on('entrarSala', data => {
        adicionarJogadorESala(data.idSala, socket.id, data.username);
        socket.emit('salaConectada', data.idSala);
    });

    socket.on('sairSala', () => {
        removerJogadorSala(socket.id);
    });

    socket.on('disconnect', () => {
        removerJogadorSala(socket.id);
    });
});

server.listen(3000);