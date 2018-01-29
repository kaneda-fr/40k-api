'use strict';
/*var Joueur = require('../models/Joueur');
var Match = require('../models/Match');*/

const fs = require('fs');
const swaggerMongoose = require('swagger-mongoose');

var swaggerDefinition = fs.readFileSync('./api/swagger.json');
var models = swaggerMongoose.compile(swaggerDefinition).models
var Joueur = models.joueur;
var Match = models.match;
var matchDetailJoueur = models.matchDetailJoueur;
var MyError = models.Error;

var classement = require('../classement');

function classementRun(){
  console.log("Running ranking");
  return Joueur.find().sort('datecreation').exec(function (err, joueurs) {
    if (err) {
      res.end();
      return handleError(err);
    }

    // Ranking by order of player registration
    var i=1;
    for (let joueur of joueurs) {
      joueur.classement = i++;
      joueur.parties = 0;
    }

    return Match.find().sort('date').exec(function (err, matches) {
      if (err) {
        return {code: 400, message: err};
      }

      function findByName(joueur, index) {
        return joueur.nom == this;
      };

      function findByRank(joueur, index) {
        return joueur.classement == this;
      };

      function swapRank(joueurs, indexJ1, indexJ2) {
        console.log("Swapping: " + joueurs[indexJ1].nom + " & " + joueurs[indexJ2].nom);
        var c = joueurs[indexJ1].classement;
        joueurs[indexJ1].classement = joueurs[indexJ2].classement;
        joueurs[indexJ2].classement = c;
      }

      function displayRank(joueurs){
        for(let joueur of joueurs){
          console.log(joueur.classement+" " + joueur.nom);
        }
      }

      displayRank(joueurs);

      for (let match of matches) {
        console.log(match.date + ": " +  (match.joueurs[0].vainqueur ? "V " : "") + match.joueurs[0].nom + "-" + match.joueurs[1].nom +  (match.joueurs[1].vainqueur ? " V" : ""));
        var indexJ1 = joueurs.findIndex(findByName, (match.joueurs[0].nom));
        var indexJ2 = joueurs.findIndex(findByName, (match.joueurs[1].nom));

        joueurs[indexJ1].parties ++;
        joueurs[indexJ2].parties ++;

        if (match.joueurs[0].vainqueur === true){
          if (joueurs[indexJ1].classement > joueurs[indexJ2].classement){
            swapRank(joueurs, indexJ1, indexJ2);
          } else if (joueurs[indexJ1].classement < joueurs[indexJ2].classement) {
            var indexJ3 = joueurs.findIndex(findByRank, joueurs[indexJ1].classement-1);
            if (indexJ3 >= 0) {
              swapRank(joueurs, indexJ1, indexJ3);
            } else {
              var indexJ3 = joueurs.findIndex(findByRank, joueurs[indexJ2].classement+1);
              if (indexJ3 >= 0) {
                swapRank(joueurs, indexJ2, indexJ3);
              }
            }
          }
        } else if (match.joueurs[1].vainqueur === true) {
          if (joueurs[indexJ2].classement > joueurs[indexJ1].classement){
            swapRank(joueurs, indexJ1, indexJ2);
          } else if (joueurs[indexJ2].classement < joueurs[indexJ1].classement) {
            var indexJ3 = joueurs.findIndex(findByRank, joueurs[indexJ2].classement-1);
            if (indexJ3 >= 0) {
              swapRank(joueurs, indexJ2, indexJ3);
            } else {
              var indexJ3 = joueurs.findIndex(findByRank, joueurs[indexJ1].classement+1);
              if (indexJ3 >= 0) {
                swapRank(joueurs, indexJ1, indexJ3);
              }
            }
          }
        }
      }

      displayRank(joueurs);

      /*joueurs[0].save(function (err, fluffy) {
        console.log("Saving " + joueurs[0].nom);
        if (err) return console.error(err);
        console.log(fluffy.nom + " -- Saved");
      });*/
      for (let joueur of joueurs){
        console.log("Saving " + joueur.nom);

        joueur.save(function (err, fluffy) {
          if (err) {
             console.error(err);
             return {code: 400, message: err};
          }
          console.log(fluffy.nom);
        });
      }

      return {
        code: 200,
        message: "ranking completed",
      };
    });
  });
}

function classementPUT(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(classementRun()|| {}, null, 2));
}

function classementGET(req, res, next) {
  /**
   * show board
   * return the ranking board
   *
   * date String date du classement (optional)
   * returns List
   **/

/*   Joueur.find({nom: "Mike"}, { _id: 0, __v: 0 }).sort( { classement: 1 } ).exec(function (err, joueur) {
     if (err) {
       res.end();
       return handleError(err);
     }
     var newM = new Match({ date: new Date(), vainqueur: joueur, perdant: joueur});
     newM.save(function (err, fluffy) {
       if (err) return console.error(err);
     });
   })
*/
   Joueur.find({}, { _id: 0, __v: 0 }).sort('classement').exec(function (err, joueur) {
     if (err) {
       res.end();
       return handleError(err);
     }
     console.log(joueur)

     if (joueur.length > 0) {
       res.setHeader('Content-Type', 'application/json');
       res.setHeader('Access-Control-Allow-Origin', '*')
       res.end(JSON.stringify(joueur|| {}, null, 2));
     } else {
       res.end();
     }
   })
}

function joueurNomGET(req, res, next) {
  /**
   * return a player by id
   *
   * nom String nom du joueur
   * returns joueur
   **/

   var nom = req.swagger.params.nom.value;
   console.log("nom: " + nom);


  Joueur.findOne({nom: nom}, { _id: 0, __v: 0, fbuserid: 0, fbname: 0, admin: 0, actif: 0}).exec(function (err, joueur) {
    if (err) {
      res.end();
      return handleError(err);
    }
    //console.log("Joueur: " + joueur);

    if (joueur) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(joueur|| {}, null, 2));
    } else {
      res.end("User not found");
    }
  })
}

function joueurPUT(req, res, next) {
  /**
  * return a player by id
  *
  * joueur Joueur details du joueur
  * returns joueur
  **/


  const data = req.swagger.params.joueur.value;
  console.log(JSON.stringify(data));

  Joueur.findOne({fbuserid: data.fbuserid}).exec(function (err, joueur) {
    if (err) {
      res.end();
      return handleError(err);
    }
    //console.log("Joueur: " + joueur);

    if (joueur) {
      // Modification Joueur
      console.log('Update update');

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(joueur|| {}, null, 2));
    } else {
      // Creation Joueur
      console.log('Creation Joueur');

      Joueur.findOne()
      .sort('-classement')  // give me the max
      .exec(function (err, dernierJoueur) {
        var newJoueur = new Joueur(data);
        newJoueur.admin = false;
        newJoueur.actif = false;
        newJoueur.datecreation = new Date();
        newJoueur.parties = 0;
        newJoueur.classement = dernierJoueur.classement + 1;

        newJoueur.save(function (err, fluffy) {
          if (err) return console.error(err);
        });
      });
    }
  });
}

function joueurFBGET(req, res, next) {
  /**
   * return a player by id
   *
   * nom String nom du joueur
   * returns joueur
   **/

   var userid = req.swagger.params.userid.value;
   console.log("FB userid: " + userid);


  Joueur.findOne({fbuserid: userid}).exec(function (err, joueur) {
    if (err) {
      res.end();
      return handleError(err);
    }

    console.log("Joueur: " + joueur );

    if (joueur) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(joueur|| {}, null, 2));
    } else {
      var error = { code: 100, message: 'Joueur non trouvé', fields: 'userid'};
      res.end(JSON.stringify(error|| {}, null, 2));
    }
  })
}


function matchGET(req, res, next) {
  /**
   * return list of match
   *
   * returns List
   **/

   /*var newM = new Match({ date: new Date(), vainqueur: 'rien', perdant: 'toto' });
   newM.save(function (err, fluffy) {
     if (err) return console.error(err);
   });*/

  //args.nom.value

  Match.find({}, { _id: 0, __v: 0}).sort( { date: 1 } ).exec(function (err, match) {
    if (err) {
      res.end();
      return handleError(err);
    }
    console.log(match)

    if (match.length > 0) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(match|| {}, null, 2));
    } else {
      res.end();
    }
  })
}

function matchPUT(req, res, next) {
  /**
   * record a match
   *
   * joueur String nom du joueur qui entre le match
   * accessToken String token d'acces du joueur
   * vainqueur String nom du vainqueur
   * armeevainqueur String armee du vainqueur
   * pointsvainqueur Integer nombre de points de l'armee du vainqueur
   * perdant String nom du perdant
   * armeeperdant String armee du perdant
   * pointsperdant Integer nombre de points de l'armee du perdant
   * formatPartie String format de la partie
   * derniertour Integer numero du dernier tour
   * date Date Date du match (optional)
   * scenario String nom du scenario joue (optional)
   * points Integer nombre de points de la partie (optional)
   * powerlevel Integer nombre de PL de la partie (optional)
   * scorevainqueur Integer score du vainqueur (optional)
   * scoreperdant Integer score du perdant (optional)
   * briseurligne String nom du joueur ayant score en briseur de ligne (optional)
   * premiersang String nom du joueur ayant score en premier sang (optional)
   * seigneurguerre String nom du joueur ayant score le seigneur de guere (optional)
   * tablerase Boolean Tour auquel la partie a ete gagne par table rase (optional)
   * returns match
   **/

  console.log('match data:');
  //console.log(JSON.stringify(req.swagger.params.match.value));
  var match = new Match(req.swagger.params.match.value);
  console.log(JSON.stringify(match));
  match.save(function (err, match) {
    if (err) return console.error(err);
    match.id = match._id;
    match.save(function (err, match) {
      if (err) return console.error(err);
    });
    classementRun();
  });

  /*var examples = {};
  examples['application/json'] = {
  "date" : "2000-01-23T04:56:07.000+00:00",
  "vainqueur" : {
    "armee" : "aeiou",
    "fbuserid" : "aeiou",
    "classement" : 0,
    "parties" : 6,
    "admin" : true,
    "datecreation" : "2000-01-23T04:56:07.000+00:00",
    "accessToken" : "aeiou",
    "nom" : "aeiou"
  },
  "scoreperdant" : 2,
  "powerlevel" : 5,
  "seigneurguerre" : "aeiou",
  "perdant" : "",
  "scorevainqueur" : 5,
  "briseurligne" : "aeiou",
  "tablerase" : true,
  "points" : 1,
  "scenario" : "aeiou",
  "premiersang" : "aeiou",
  "formatPartie" : "aeiou",
  "derniertour" : 7
};*/
  if (Object.keys(match).length > 0) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(match[Object.keys(match)[0]] || {}, null, 2));
  } else {
    res.end();
  }
}

function matchJoueurNomGET(req, res, next) {
  /**
   * return list of match for a player
   *
   * nom String nom du joueur
   * returns List
   **/

   var nom = req.swagger.params.nom.value;
     console.log("matchjoueurNomGET " + nom)

   Match.find({joueurs: {$elemMatch: {nom: nom}}}, { _id: 0, __v: 0}).sort( { date: 'desc' } ).exec(function (err, match) {
     if (err) {
       res.end();
       return handleError(err);
     }
     console.log(match)

     if (match.length > 0) {
       res.setHeader('Content-Type', 'application/json');
       res.end(JSON.stringify(match|| {}, null, 2));
     } else {
       res.end(JSON.stringify({}, null, 2));
     }
   })
}

function joueursGET(req, res, next) {
  /**
  * return list of all players
  *
  * accessToken String Access Token
  * returns List
  **/
  console.log("joueursGET");

  //console.log(res.socket.parser.incoming.headers['x-fb-api-key']);
  var accessToken = res.socket.parser.incoming.headers['x-fb-api-key'];
  console.log("access Token: " + accessToken);
  var userId = accessToken.split('----')[0].replace(/^"/, '');

  Joueur.findOne({fbuserid: userId, actif: true}).exec(function (err, joueur) {
    if (err) {
      res.end();
      return handleError(err);
    }

    if (joueur !== null){
      var listeNoms = [];
      Joueur.find({}, 'nom').exec(function (err, listeJoueurs) {
        if (err) {
          res.end();
          return handleError(err);
        }

        for (var key in listeJoueurs) {
          listeNoms.push(listeJoueurs[key].nom);
        }
        console.log("Liste Joueurs:" + listeNoms);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(listeNoms|| {}, null, 2));
      })
    } else {
      console.log('Utilisateur ' + userId + ' non trouve ou innactif');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({code: -1, message: 'UserId inconnu ou desactivé'}));
    }



  })
}



// export the middleware function
module.exports = {
  classementGET,
  classementPUT,
  joueurNomGET,
  joueurPUT,
  matchGET,
  matchPUT,
  matchJoueurNomGET,
  joueurFBGET,
  joueursGET,
};
