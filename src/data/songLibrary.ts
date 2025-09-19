export interface SongTemplate {
  title: string;
  lyrics: string;
  author?: string;
  melody?: string;
  category: 'entrance' | 'kyrie' | 'gloria' | 'offertory' | 'sanctus' | 'communion' | 'final' | 'other';
}

export const songLibrary: SongTemplate[] = [
  // Chants d'entrée
  {
    title: "Peuple de Dieu, marche joyeux",
    category: "entrance",
    author: "Jo Akepsimas",
    lyrics: `Peuple de Dieu, marche joyeux,
Alléluia, alléluia !
À la rencontre de ton Dieu,
Alléluia, alléluia !

R/ Chantez, priez, célébrez le Seigneur,
Dieu nous rassemble en son amour !
Chantez, priez, célébrez le Seigneur,
Dieu nous rassemble pour toujours !

Peuple de Dieu, tu es le corps
Du Christ Jésus ressuscité !
Peuple de Dieu, tu es l'Église,
Tu es l'amour de Dieu semé !`
  },
  {
    title: "Nous sommes le corps du Christ",
    category: "entrance",
    author: "Communauté de l'Emmanuel",
    lyrics: `Nous sommes le corps du Christ,
Chacun de nous est un membre de ce corps.
Chacun reçoit la grâce de l'Esprit
Pour le bien du corps entier.

R/ Nous sommes le corps du Christ,
Nous sommes le corps du Christ !

Dieu nous a tous appelés
À tenir la même espérance.
Nous sommes le peuple de Dieu,
Nous sommes l'Église du Seigneur.`
  },
  {
    title: "Venez, divin Messie",
    category: "entrance",
    author: "Abbé Pellegrin",
    lyrics: `Venez, divin Messie,
Sauvez nos jours infortunés !
Venez, source de vie !
Venez, venez, venez !

R/ Ah ! Venez, divin Messie,
Sauvez nos jours infortunés !
Venez, source de vie !
Venez, venez, venez !

Vous êtes notre attente,
Le Sauveur qu'il nous faut ;
Votre parole sainte
Nous relèvera bientôt.`
  },

  // Kyrie
  {
    title: "Kyrie Eleison (Taizé)",
    category: "kyrie",
    author: "Communauté de Taizé",
    lyrics: `Kyrie eleison, Kyrie eleison,
Kyrie eleison.

Christe eleison, Christe eleison,
Christe eleison.

Kyrie eleison, Kyrie eleison,
Kyrie eleison.`
  },
  {
    title: "Prends pitié de nous, Seigneur",
    category: "kyrie",
    lyrics: `Prends pitié de nous, Seigneur,
Prends pitié de nous !
Prends pitié de nous, Seigneur,
Prends pitié de nous !

Ô Christ, prends pitié de nous,
Ô Christ, prends pitié !
Ô Christ, prends pitié de nous,
Ô Christ, prends pitié !

Prends pitié de nous, Seigneur,
Prends pitié de nous !
Prends pitié de nous, Seigneur,
Prends pitié de nous !`
  },

  // Gloria
  {
    title: "Gloire à Dieu au plus haut des cieux",
    category: "gloria",
    lyrics: `Gloire à Dieu au plus haut des cieux,
Et paix sur la terre aux hommes qu'il aime.
Nous te louons, nous te bénissons,
Nous t'adorons, nous te glorifions,
Nous te rendons grâce pour ton immense gloire,
Seigneur Dieu, Roi du ciel,
Dieu le Père tout-puissant.

Seigneur, Fils unique, Jésus Christ,
Seigneur Dieu, Agneau de Dieu,
Le Fils du Père,
Toi qui enlèves le péché du monde,
Prends pitié de nous ;
Toi qui enlèves le péché du monde,
Reçois notre prière.`
  },
  {
    title: "Gloria (Taizé)",
    category: "gloria",
    author: "Communauté de Taizé",
    lyrics: `Gloria, gloria, in excelsis Deo !
Gloria, gloria, alléluia, alléluia !

Gloria, gloria, in excelsis Deo !
Gloria, gloria, alléluia, alléluia !`
  },

  // Offertoire
  {
    title: "Pain de Dieu, pain rompu",
    category: "offertory",
    author: "Didier Rimaud",
    lyrics: `Pain de Dieu, pain rompu,
Rassemblant en un corps
Ceux qui l'ont reçu,
Tu nous livres le secret
De l'amour le plus fort,
Rien ne peut l'arrêter.

R/ Que soit béni le nom du Seigneur,
Maintenant et à jamais !
Que soit béni le nom du Seigneur,
Lui qui nous donne la paix !

Vin nouveau de l'amour,
Sang versé une fois
Pour les siècles et les jours,
Tu nous livres le secret
De l'amour le plus vrai,
Rien ne peut l'épuiser.`
  },
  {
    title: "Accepte nos offrandes",
    category: "offertory",
    lyrics: `Accepte nos offrandes, ô Père très aimant,
Nous t'offrons ces présents,
Le pain et le vin.

R/ Béni sois-tu, Seigneur,
Dieu de l'univers !
Toi qui nous donnes ce pain,
Fruit de la terre et du travail des hommes,
Nous te le présentons,
Il deviendra le pain de la vie.

Béni sois-tu, Seigneur,
Dieu de l'univers !
Toi qui nous donnes ce vin,
Fruit de la vigne et du travail des hommes,
Nous te le présentons,
Il deviendra le vin du royaume éternel.`
  },

  // Sanctus
  {
    title: "Saint le Seigneur",
    category: "sanctus",
    lyrics: `Saint ! Saint ! Saint, le Seigneur,
Dieu de l'univers !
Le ciel et la terre sont remplis de ta gloire.
Hosanna au plus haut des cieux !

Béni soit celui qui vient
Au nom du Seigneur !
Hosanna au plus haut des cieux !
Hosanna au plus haut des cieux !`
  },
  {
    title: "Sanctus (Taizé)",
    category: "sanctus",
    author: "Communauté de Taizé",
    lyrics: `Sanctus, Sanctus, Sanctus,
Dominus Deus Sabaoth.
Pleni sunt caeli et terra gloria tua.
Hosanna in excelsis !

Benedictus qui venit
In nomine Domini.
Hosanna in excelsis !
Hosanna in excelsis !`
  },

  // Communion
  {
    title: "Je vous donne un commandement nouveau",
    category: "communion",
    author: "Communauté de l'Emmanuel",
    lyrics: `Je vous donne un commandement nouveau :
Aimez-vous les uns les autres.
Je vous donne un commandement nouveau :
Aimez-vous les uns les autres.

R/ Comme je vous ai aimés,
Aimez-vous les uns les autres.
Comme je vous ai aimés,
Aimez-vous les uns les autres.

À ceci, tous reconnaîtront
Que vous êtes mes disciples :
Si vous avez de l'amour
Les uns pour les autres.`
  },
  {
    title: "Pain véritable",
    category: "communion",
    author: "Didier Rimaud",
    lyrics: `Pain véritable et parole de vie,
Jésus se donne en nourriture.
Heureux les invités au repas du Seigneur !
Voici l'Agneau de Dieu
Qui enlève le péché du monde.

R/ Seigneur, je ne suis pas digne
De te recevoir,
Mais dis seulement une parole
Et je serai guéri.

Rassasiés de ce pain du ciel,
Nous rendons grâce au Père.
Il nous envoie porter sa paix
Et son amour au monde.`
  },
  {
    title: "Goûtez et voyez",
    category: "communion",
    lyrics: `Goûtez et voyez comme est bon le Seigneur !
Goûtez et voyez comme est bon le Seigneur !
Comme est bon le Seigneur !
Comme est bon le Seigneur !

Heureux qui espère en lui !
Heureux qui espère en lui !
Qui espère en lui !
Qui espère en lui !`
  },

  // Chants de sortie
  {
    title: "Allez par toute la terre",
    category: "final",
    author: "Communauté de l'Emmanuel",
    lyrics: `Allez par toute la terre,
Proclamez l'Évangile !
Allez par toute la terre,
Proclamez l'Évangile !

R/ Alléluia, alléluia,
Proclamez l'Évangile !
Alléluia, alléluia,
Proclamez l'Évangile !

De toutes les nations
Faites des disciples !
Baptisez-les au nom
Du Père et du Fils et du Saint-Esprit !`
  },
  {
    title: "Marie, Mère de grâce",
    category: "final",
    lyrics: `Marie, Mère de grâce,
Mère de miséricorde,
Défends-nous de l'ennemi
Et reçois-nous à l'heure de la mort.

R/ Je vous salue Marie,
Comblée de grâce,
Le Seigneur est avec vous,
Vous êtes bénie entre toutes les femmes.

Sainte Marie, Mère de Dieu,
Priez pour nous pauvres pécheurs,
Maintenant et à l'heure de notre mort.
Amen.`
  },
  {
    title: "Magnificat",
    category: "final",
    lyrics: `Mon âme exalte le Seigneur,
Exulte mon esprit en Dieu, mon Sauveur !
Il s'est penché sur son humble servante ;
Désormais, tous les âges me diront bienheureuse.

R/ Le Puissant fit pour moi des merveilles ;
Saint est son nom !
Son amour s'étend d'âge en âge
Sur ceux qui le craignent.

Déployant la force de son bras,
Il disperse les superbes.
Il renverse les puissants de leurs trônes,
Il élève les humbles.`
  }
];