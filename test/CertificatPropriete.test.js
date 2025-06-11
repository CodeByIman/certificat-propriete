const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificatPropriete", function () {
    let certificatPropriete;
    let owner, addr1, addr2;
    
    beforeEach(async function () {
        // Obtenir les comptes de test
        [owner, addr1, addr2] = await ethers.getSigners();
        
        // Déployer le contrat
        const CertificatPropriete = await ethers.getContractFactory("CertificatPropriete");
        certificatPropriete = await CertificatPropriete.deploy();
        await certificatPropriete.waitForDeployment();
    });
    
    describe("Enregistrement de certificats", function () {
        it("Devrait enregistrer un nouveau certificat", async function () {
            const hashFichier = "QmX1234567890abcdef";
            const nomFichier = "mon-document.pdf";
            
            await expect(
                certificatPropriete.enregistrerCertificat(hashFichier, nomFichier)
            )
                .to.emit(certificatPropriete, "CertificatCree")
                .withArgs(1, hashFichier, owner.address, nomFichier);
            
            // Vérifier que le certificat existe
            const cert = await certificatPropriete.obtenirCertificat(1);
            expect(cert.hashFichier).to.equal(hashFichier);
            expect(cert.proprietaire).to.equal(owner.address);
            expect(cert.nomFichier).to.equal(nomFichier);
        });
        
        it("Ne devrait pas permettre d'enregistrer le même hash deux fois", async function () {
            const hashFichier = "QmX1234567890abcdef";
            
            await certificatPropriete.enregistrerCertificat(hashFichier, "fichier1.pdf");
            
            await expect(
                certificatPropriete.enregistrerCertificat(hashFichier, "fichier2.pdf")
            ).to.be.revertedWith("Ce fichier est deja enregistre");
        });
    });
    
    describe("Transfert de certificats", function () {
        beforeEach(async function () {
            await certificatPropriete.enregistrerCertificat(
                "QmX1234567890abcdef", 
                "document.pdf"
            );
        });
        
        it("Devrait permettre au propriétaire de transférer", async function () {
            await expect(
                certificatPropriete.transfererCertificat(1, addr1.address)
            )
                .to.emit(certificatPropriete, "CertificatTransfere")
                .withArgs(1, owner.address, addr1.address);
            
            const cert = await certificatPropriete.obtenirCertificat(1);
            expect(cert.proprietaire).to.equal(addr1.address);
        });
        
        it("Ne devrait pas permettre à un non-propriétaire de transférer", async function () {
            await expect(
                certificatPropriete.connect(addr1).transfererCertificat(1, addr2.address)
            ).to.be.revertedWith("Vous n'etes pas le proprietaire");
        });
    });
    
    describe("Vérification de propriété", function () {
        it("Devrait vérifier correctement la propriété par hash", async function () {
            const hashFichier = "QmX1234567890abcdef";
            await certificatPropriete.enregistrerCertificat(hashFichier, "test.pdf");
            
            const [proprietaire, existe] = await certificatPropriete.verifierProprietaireParHash(hashFichier);
            expect(proprietaire).to.equal(owner.address);
            expect(existe).to.be.true;
        });
        
        it("Devrait retourner false pour un hash inexistant", async function () {
            const [proprietaire, existe] = await certificatPropriete.verifierProprietaireParHash("hash-inexistant");
            expect(proprietaire).to.equal(ethers.ZeroAddress);
            expect(existe).to.be.false;
        });
    });
});