// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CertificatPropriete {
    // Structure pour représenter un certificat
    struct Certificat {
        uint256 id;
        string hashFichier;     // Hash du fichier ou URI
        address proprietaire;   // Adresse du propriétaire
        string nomFichier;      // Nom du fichier (optionnel)
        uint256 dateCreation;   // Timestamp de création
        bool existe;            // Pour vérifier l'existence
    }
    
    // Variables d'état
    mapping(uint256 => Certificat) public certificats;
    mapping(string => uint256) public hashToCertificat; // Hash -> ID certificat
    uint256 public prochainId = 1;
    
    // Événements (pour le frontend)
    event CertificatCree(
        uint256 indexed id,
        string hashFichier,
        address indexed proprietaire,
        string nomFichier
    );
    
    event CertificatTransfere(
        uint256 indexed id,
        address indexed ancienProprietaire,
        address indexed nouveauProprietaire
    );
    
    // Modificateur pour vérifier la propriété
    modifier seulementProprietaire(uint256 _id) {
        require(certificats[_id].existe, "Certificat inexistant");
        require(
            certificats[_id].proprietaire == msg.sender,
            "Vous n'etes pas le proprietaire"
        );
        _;
    }
    
    // Fonction pour enregistrer un nouveau certificat
    function enregistrerCertificat(
        string memory _hashFichier,
        string memory _nomFichier
    ) public {
        // Vérifier que le hash n'existe pas déjà
        require(
            hashToCertificat[_hashFichier] == 0,
            "Ce fichier est deja enregistre"
        );
        
        // Créer le certificat
        uint256 nouveauId = prochainId;
        certificats[nouveauId] = Certificat({
            id: nouveauId,
            hashFichier: _hashFichier,
            proprietaire: msg.sender,
            nomFichier: _nomFichier,
            dateCreation: block.timestamp,
            existe: true
        });
        
        // Mapper le hash à l'ID
        hashToCertificat[_hashFichier] = nouveauId;
        
        // Incrémenter l'ID pour le prochain certificat
        prochainId++;
        
        // Émettre l'événement
        emit CertificatCree(nouveauId, _hashFichier, msg.sender, _nomFichier);
    }
    
    // Fonction pour transférer un certificat
    function transfererCertificat(uint256 _id, address _nouveauProprietaire) 
        public 
        seulementProprietaire(_id) 
    {
        require(_nouveauProprietaire != address(0), "Adresse invalide");
        require(
            _nouveauProprietaire != msg.sender,
            "Vous etes deja le proprietaire"
        );
        
        address ancienProprietaire = certificats[_id].proprietaire;
        certificats[_id].proprietaire = _nouveauProprietaire;
        
        emit CertificatTransfere(_id, ancienProprietaire, _nouveauProprietaire);
    }
    
    // Fonction pour obtenir les détails d'un certificat
    function obtenirCertificat(uint256 _id) 
        public 
        view 
        returns (
            uint256 id,
            string memory hashFichier,
            address proprietaire,
            string memory nomFichier,
            uint256 dateCreation
        ) 
    {
        require(certificats[_id].existe, "Certificat inexistant");
        
        Certificat memory cert = certificats[_id];
        return (
            cert.id,
            cert.hashFichier,
            cert.proprietaire,
            cert.nomFichier,
            cert.dateCreation
        );
    }
    
    // Fonction pour vérifier la propriété d'un fichier par son hash
    function verifierProprietaireParHash(string memory _hashFichier) 
        public 
        view 
        returns (address proprietaire, bool existe) 
    {
        uint256 certId = hashToCertificat[_hashFichier];
        if (certId == 0) {
            return (address(0), false);
        }
        
        return (certificats[certId].proprietaire, true);
    }
    
    // Fonction pour obtenir tous les certificats d'un propriétaire
    function obtenirCertificatsProprietaire(address _proprietaire) 
        public 
        view 
        returns (uint256[] memory) 
    {
        // Compter d'abord les certificats du propriétaire
        uint256 count = 0;
        for (uint256 i = 1; i < prochainId; i++) {
            if (certificats[i].existe && certificats[i].proprietaire == _proprietaire) {
                count++;
            }
        }
        
        // Créer le tableau avec la bonne taille
        uint256[] memory resultat = new uint256[](count);
        uint256 index = 0;
        
        // Remplir le tableau
        for (uint256 i = 1; i < prochainId; i++) {
            if (certificats[i].existe && certificats[i].proprietaire == _proprietaire) {
                resultat[index] = i;
                index++;
            }
        }
        
        return resultat;
    }
}