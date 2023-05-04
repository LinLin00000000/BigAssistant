const isEmpty = function (object) {
    for (let key in object) {
        return false;
    }
    return true;
};

let pro = Promise.resolve();
let RunMessage = {};
let Member = {};
let SortedKey = {};
let Client = {
    token: '',
    templateSign: '',
    test: function (text) {
        $.ajax({
            url: '/test',
            type: 'POST',
            data: { data: text },
            success: function (data) {
                const result = JSON.parse(data);
                if (result.status == true) {
                    Client.token = result.token;
                    Client.templateSign = result.templateSign;
                    $('#testResult').empty().append('<div class="alert alert-success" style="text-align: center">Success</div>');
                    setTimeout(function () {
                        $('#connectionTest').fadeOut();
                        $('#input').fadeIn(2000);
                    }, 1000);
                }
                else {
                    $('#testResult').empty().append('<div class="alert alert-danger">Error: ' + result.errorMessage + '</div>');
                }
            }
        });
    },
};


$(function () {
    $('#testStart').click(function () {
        Client.test($('#client').val());
    });
    $('#load').click(function () {
        Member = {};
        const reg = /(\S+)(?:[ \t]+\d+[ \t]+(\d+))?/;
        const text = $('#member').val().split('\n');
        const resetFlag = document.getElementById('resetFlag').checked;
        for (let index in text) {
            const res = text[index].match(reg);
            if (res != null) {
                Member[res[1]] = { today: -1, total: resetFlag ? 0 : res[2] === undefined ? 0 : res[2] };
            }
        }
    });
    $('#select').change(function () {
        const files = document.getElementById('select').files;
        $('#fileCount').text(Number($('#fileCount').text()) + files.length);
        for (let index in files) {
            let file = files[index];
            let reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function () {
                const base64 = this.result.substr(this.result.indexOf(',') + 1);
                pro = pro.then(function () {
                    return new Promise(function (resolve) {
                        $.ajax({
                            url: '/iOCR',
                            type: 'POST',
                            data: {
                                token: Client.token,
                                templateSign: Client.templateSign,
                                image: base64
                            },
                            success: function (res) {
                                let result = JSON.parse(res);
                                if (result.error_code === 0) {
                                    let flag = false;
                                    let name = '';
                                    const retlist = result.data.ret;
                                    for (let index in retlist) {
                                        const ret = retlist[index];
                                        if (flag) {
                                            flag = false;
                                            let score = ret.word.match(/\d+/);
                                            if (score != null) {
                                                score = Number(score);
                                                Member[name].today = score - Member[name].total;
                                                Member[name].total = score;
                                            }
                                        }
                                        else {
                                            name = ret.word.trim();
                                            if (Member.hasOwnProperty(name)) {
                                                if (Member[name].today === -1) {
                                                    flag = true;
                                                }
                                            }
                                            else {
                                                if (name !== '') {
                                                    console.log('Miss: ' + name);
                                                }
                                            }
                                        }
                                    }
                                }
                                else {
                                    RunMessage[result.error_code] = result.error_msg;
                                }
                            },
                            complete: function () {
                                resolve();
                            }
                        });
                    })
                })
            };
        }
    });
    $('#run').click(function () {
        if (!isEmpty(Member)) {
            const message = $('#runMessage');
            message.empty().append('<div class="alert alert-info" style="text-align: center">Updating...</div>');
            document.getElementById("run").disabled = true;
            pro = pro.then(function () {
                return new Promise(function (resolve) {
                    SortedKey = {};
                    SortedKey = Object.keys(Member).sort(function (a, b) {
                        return Member[b].today - Member[a].today;
                    });
                    const table = $('#dataTable');
                    table.empty();
                    for (let index in SortedKey) {
                        const name = SortedKey[index];
                        table.append('<tr><td>' + name + '</td><td>'
                            + Member[name].today + '</td><td>' + Member[name].total + '</td></tr>');
                    }

                    message.empty();
                    if (isEmpty(RunMessage)) {
                        message.append('<div class="alert alert-success" style="text-align: center">Success</div>');
                    }
                    else {
                        for (let key in RunMessage) {
                            message.append('<div class="alert alert-warning">' +
                                'Error: ' + key + ' ' + RunMessage[key] + '</div>');
                        }
                    }
                    RunMessage = {};

                    if (document.getElementById('output').className.includes('IFade')) {
                        $('#output').fadeIn(2000).removeClass('IFade');
                    }
                    document.getElementById("run").disabled = false;
                    resolve();
                })
            });
        }
    });
    $('#copy').click(function () {
        let copyContent = document.createElement('textarea');
        for (let index in SortedKey) {
            const name = SortedKey[index];
            copyContent.value += name + ' ' + Member[name].today + ' ' + Member[name].total + '\n';
        }
        document.body.appendChild(copyContent);
        copyContent.select();
        document.execCommand('Copy');
        document.body.removeChild(copyContent);
    });
    $('#connectionTest').fadeIn(2000);
    // $('#input').fadeIn(2000);
    $('footer').fadeIn(2000);
});
