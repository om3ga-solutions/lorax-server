var request = require("request");
var program = require('commander');
var fs = require('fs');
var querystring = require('querystring');

program.version('1.0.0')
    .option('-p, --projectId [type]', 'projectId', "97547")
    .option('-t, --token [type]', 'token')
    .parse(process.argv);

downloadData(program.projectId, program.language, program.token);


function downloadData(projectId, language, token) {

    var data_tokenId = {
        api_token: token,
        id: projectId,
    }
    var postData_languages = querystring.stringify(data_tokenId);

    var languagesWhitelist = ['cs', 'de', 'en', 'es', 'ru', 'sk'];

    console.log("get languages...");

    getProjectLanguages(postData_languages, (languages) => {
        for (id in languages) {

            var lang_code = languages[id].code;

            if (languagesWhitelist.indexOf(lang_code) === -1) {
              continue;
            }

            var data_tokenIdLanguage = {
                api_token: token,
                id: projectId,
                language: lang_code
            }
            var postData_terms = querystring.stringify(data_tokenIdLanguage);

            getTerms(postData_terms, lang_code);
        }
    });

    //getTerms(postData_terms);

}

function getProjectLanguages(token_data, callback) {
    var options = {
        method: 'POST',
        url: 'https://api.poeditor.com/v2/languages/list',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'cache-control': 'no-cache'
        },
        body: token_data,
        json: true
    };

    request(options, function(error, response, body) {
        if (error) throw new Error(error);

        request(options, function(error, response, body) {
            if (error) throw new Error(error);

            var languages = [];

            for (id in body.result.languages) {
                var code = body.result.languages[id].code;
                var name = body.result.languages[id].name;

                var lang_obj = {
                    name: name,
                    code: code
                };

                languages.push(lang_obj);
            }

            console.log("Languages: " + languages.length);

            callback(languages);

        });

    });
}



function getTerms(token_data, languageCode) {
    var options = {
        method: 'POST',
        url: 'https://api.poeditor.com/v2/terms/list',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'cache-control': 'no-cache'
        },
        body: token_data,
        json: true
    };

    request(options, function(error, response, body) {
        if (error) throw new Error(error);

        var terms = body.result.terms;
        //var export_data = [];
        var term_obj = {};

        for (id in body.result.terms) {
            var result_term = body.result.terms[id];
            var term = result_term.term;
            var translation = result_term.translation.content;

            var mail_prefix = "mail.";

            if(term.startsWith(mail_prefix))
            {
                term_obj[term] = translation;
                console.log(term_obj['term'] + " -- " + translation);

                //export_data.push(term_obj);
            }



            //console.log(term + " --- " + translation);
        }

        //console.log("Terms count: " + terms.length);
        //console.log(export_data);

        var exportString = "";
        exportString += JSON.stringify(term_obj, null, '\t');

        fs.writeFile("data/localization/" + languageCode + ".json", exportString, function(err) {
            if (err) {
                return console.log(err);
            }

            console.log(`The file ${languageCode} was saved!`);
        });

    });
}
