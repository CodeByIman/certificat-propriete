import React, { useState, useEffect } from 'react';
import { Upload, FileCheck, Shield, AlertCircle, CheckCircle, Clock, User, Hash, FileText, Send, Eye, ArrowRightLeft, X, ExternalLink } from 'lucide-react';

const CertificateApp = () => {
  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState('');
  const [isHashing, setIsHashing] = useState(false);
  const [account, setAccount] = useState('');
  const [certificates, setCertificates] = useState([]);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contractAddress, setContractAddress] = useState('0x5FbDB2315678afecb367f032d93F642f64180aa3');
  const [debugLog, setDebugLog] = useState([]);
  
  // Nouveaux états pour les fonctionnalités manquantes
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [transferAddress, setTransferAddress] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [transferHistory, setTransferHistory] = useState([]);
  
  // Nouveaux états pour la gestion des contacts
  const [contacts, setContacts] = useState([]);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactAddress, setNewContactAddress] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]);

  // Enhanced logging function
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logEntry);
    setDebugLog(prev => [...prev.slice(-9), logEntry]); // Keep last 10 logs
  };

  // ABI du contrat avec événements
  const contractABI = [
    "function enregistrerCertificat(string memory _hashFichier, string memory _nomFichier) public",
    "function obtenirCertificat(uint256 _id) public view returns (uint256 id, string memory hashFichier, address proprietaire, string memory nomFichier, uint256 dateCreation)",
    "function verifierProprietaireParHash(string memory _hashFichier) public view returns (address proprietaire, bool existe)",
    "function obtenirCertificatsProprietaire(address _proprietaire) public view returns (uint256[] memory)",
    "function transfererCertificat(uint256 _id, address _nouveauProprietaire) public",
    "event CertificatCree(uint256 indexed id, string hashFichier, address indexed proprietaire, string nomFichier)",
    "event CertificatTransfere(uint256 indexed id, address indexed ancienProprietaire, address indexed nouveauProprietaire)"
  ];

  // Validation d'adresse Ethereum
  const isValidEthereumAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Enhanced function to calculate file hash
  const calculateFileHash = async (file) => {
    setIsHashing(true);
    addLog(`Starting hash calculation for file: ${file.name} (${file.size} bytes)`);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      addLog(`File read successfully, buffer size: ${arrayBuffer.byteLength} bytes`);
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      addLog(`Hash calculated successfully: ${hashHex}`);
      setFileHash(hashHex);
      return hashHex;
    } catch (error) {
      addLog(`Hash calculation error: ${error.message}`, 'error');
      console.error('Erreur lors du calcul du hash:', error);
      alert('Erreur lors du calcul du hash: ' + error.message);
    } finally {
      setIsHashing(false);
    }
  };

  // Enhanced file upload handler
  const handleFileUpload = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      addLog(`File selected: ${selectedFile.name}, size: ${selectedFile.size} bytes, type: ${selectedFile.type}`);
      setFile(selectedFile);
      await calculateFileHash(selectedFile);
      setVerificationResult(null);
    }
  };

  // Enhanced wallet connection
  const connectWallet = async () => {
    addLog('Attempting to connect wallet...');
    
    if (typeof window.ethereum === 'undefined') {
      addLog('MetaMask not detected', 'error');
      alert('MetaMask non détecté ! Veuillez installer MetaMask.');
      return;
    }

    if (typeof window.ethers === 'undefined') {
      addLog('Ethers.js not loaded, attempting to load...', 'warning');
      alert('Ethers.js en cours de chargement... Veuillez patienter et réessayer dans quelques secondes.');
      return;
    }

    try {
      addLog('Requesting accounts...');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      addLog(`Accounts received: ${accounts.length} accounts`);
      setAccount(accounts[0]);
      addLog(`Connected to account: ${accounts[0]}`);
      
      // Check network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      addLog(`Current chain ID: ${chainId}`);
      
      if (chainId !== '0x7a69') { // 31337 en hexadécimal
        addLog('Wrong network detected, attempting to switch...', 'warning');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7a69' }],
          });
          addLog('Network switched successfully');
        } catch (switchError) {
          addLog(`Switch error: ${switchError.message}`, 'error');
          if (switchError.code === 4902) {
            addLog('Adding Hardhat network...');
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x7a69',
                chainName: 'Hardhat Local',
                rpcUrls: ['http://127.0.0.1:8545'],
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                }
              }]
            });
            addLog('Hardhat network added successfully');
          }
        }
      }
    } catch (error) {
      addLog(`Wallet connection error: ${error.message}`, 'error');
      console.error('Erreur de connexion:', error);
      alert('Erreur lors de la connexion à MetaMask: ' + error.message);
    }
  };

  // Enhanced certificate registration
  const registerCertificate = async () => {
    addLog('Starting certificate registration...');
    
    if (!file || !fileHash || !account) {
      addLog('Missing requirements for registration', 'error');
      alert('Veuillez sélectionner un fichier et connecter votre wallet');
      return;
    }

    if (typeof window.ethers === 'undefined') {
      addLog('Ethers.js not available', 'error');
      alert('Ethers.js non disponible. Veuillez recharger la page.');
      return;
    }

    setLoading(true);
    addLog(`Registering certificate for file: ${file.name}, hash: ${fileHash}`);

    try {
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      addLog(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
      
      if (network.chainId !== 31337) {
        addLog(`Wrong network: expected 31337, got ${network.chainId}`, 'error');
        alert('Veuillez vous connecter au réseau Hardhat Local (chainId: 31337)');
        return;
      }

      const signer = provider.getSigner();
      const contract = new window.ethers.Contract(contractAddress, contractABI, signer);
      
      const tx = await contract.enregistrerCertificat(fileHash, file.name);
      addLog(`Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      addLog(`Transaction confirmed in block: ${receipt.blockNumber}`);

      alert('Certificat enregistré avec succès !');
      loadUserCertificates();
      
      // Reset form
      setFile(null);
      setFileHash('');
      const fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      addLog(`Registration error: ${error.message}`, 'error');
      if (error.message.includes('Ce fichier est deja')) {
        alert('Ce fichier est déjà certifié !');
      } else {
        alert('Erreur lors de l\'enregistrement: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Enhanced verification
  const verifyCertificate = async () => {
    if (!fileHash) {
      alert('Veuillez d\'abord sélectionner un fichier');
      return;
    }

    try {
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const contract = new window.ethers.Contract(contractAddress, contractABI, provider);

      const [owner, exists] = await contract.verifierProprietaireParHash(fileHash);
      
      setVerificationResult({
        exists,
        owner: exists ? owner : null,
        isOwner: exists && account && owner.toLowerCase() === account.toLowerCase()
      });
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la vérification: ' + error.message);
    }
  };

  // NOUVELLE FONCTION: Transfert de certificat
  const transferCertificate = async () => {
    if (!selectedCertificate || !transferAddress) {
      alert('Veuillez sélectionner un certificat et une adresse de destination');
      return;
    }

    if (!isValidEthereumAddress(transferAddress)) {
      alert('Adresse Ethereum invalide');
      return;
    }

    if (transferAddress.toLowerCase() === account.toLowerCase()) {
      alert('Vous ne pouvez pas transférer à vous-même');
      return;
    }

    setTransferLoading(true);
    addLog(`Transferring certificate ${selectedCertificate.id} to ${transferAddress}`);

    try {
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new window.ethers.Contract(contractAddress, contractABI, signer);

      const tx = await contract.transfererCertificat(selectedCertificate.id, transferAddress);
      addLog(`Transfer transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      addLog(`Transfer confirmed in block: ${receipt.blockNumber}`);

      alert('Certificat transféré avec succès !');
      
      // Rafraîchir les certificats et fermer le modal
      loadUserCertificates();
      setShowTransferModal(false);
      setTransferAddress('');
      setSelectedCertificate(null);
      
    } catch (error) {
      addLog(`Transfer error: ${error.message}`, 'error');
      alert('Erreur lors du transfert: ' + error.message);
    } finally {
      setTransferLoading(false);
    }
  };

  // NOUVELLES FONCTIONS: Gestion des contacts
  const addContact = () => {
    if (!newContactName.trim() || !newContactAddress.trim()) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    
    if (!isValidEthereumAddress(newContactAddress)) {
      alert('Adresse Ethereum invalide');
      return;
    }
    
    const existingContact = contacts.find(c => 
      c.address.toLowerCase() === newContactAddress.toLowerCase() ||
      c.name.toLowerCase() === newContactName.toLowerCase()
    );
    
    if (existingContact) {
      alert('Ce contact existe déjà');
      return;
    }
    
    const newContact = {
      id: Date.now(),
      name: newContactName.trim(),
      address: newContactAddress.trim(),
      dateAdded: new Date()
    };
    
    setContacts(prev => [...prev, newContact]);
    setNewContactName('');
    setNewContactAddress('');
    setShowAddContact(false);
    addLog(`Contact ajouté: ${newContact.name} (${newContact.address})`);
  };
  
  const removeContact = (contactId) => {
    setContacts(prev => prev.filter(c => c.id !== contactId));
    addLog(`Contact supprimé`);
  };
  
  const selectContactForTransfer = (contact) => {
    setTransferAddress(contact.address);
    setShowContactsModal(false);
    addLog(`Contact sélectionné pour transfert: ${contact.name}`);
  };
  
  // NOUVELLE FONCTION: Découvrir les comptes connectés
  const discoverAccounts = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask non détecté');
      return;
    }
    
    try {
      addLog('Découverte des comptes disponibles...');
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      setConnectedAccounts(accounts);
      addLog(`${accounts.length} comptes découverts`);
      
      if (accounts.length > 1) {
        alert(`${accounts.length} comptes trouvés ! Vous pouvez maintenant les ajouter à vos contacts.`);
      }
    } catch (error) {
      addLog(`Erreur découverte comptes: ${error.message}`, 'error');
      alert('Erreur lors de la découverte des comptes: ' + error.message);
    }
  };
  
  // NOUVELLE FONCTION: Ajouter un compte découvert aux contacts
  const addDiscoveredAccount = (address, index) => {
    const name = `Compte MetaMask ${index + 1}`;
    const newContact = {
      id: Date.now(),
      name,
      address,
      dateAdded: new Date(),
      isMetaMaskAccount: true
    };
    
    setContacts(prev => [...prev, newContact]);
    addLog(`Compte MetaMask ajouté aux contacts: ${name}`);
  };
  const loadUserCertificates = async () => {
    if (!account) return;

    addLog(`Loading certificates for account: ${account}`);

    try {
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const contract = new window.ethers.Contract(contractAddress, contractABI, provider);

      const certificateIds = await contract.obtenirCertificatsProprietaire(account);
      addLog(`Found ${certificateIds.length} certificate IDs`);

      const certificateDetails = await Promise.all(
        certificateIds.map(async (id) => {
          try {
            const [certId, hash, owner, fileName, timestamp] = await contract.obtenirCertificat(id);
            return {
              id: certId.toString(),
              hash,
              owner,
              fileName,
              date: new Date(timestamp.toNumber() * 1000)
            };
          } catch (certError) {
            addLog(`Error loading certificate ${id}: ${certError.message}`, 'error');
            return null;
          }
        })
      );
      
      const validCertificates = certificateDetails.filter(cert => cert !== null);
      setCertificates(validCertificates);
    } catch (error) {
      addLog(`Error loading certificates: ${error.message}`, 'error');
      console.error('Erreur lors du chargement:', error);
    }
  };

  // NOUVELLE FONCTION: Ouvrir le modal de transfert
  const openTransferModal = (certificate) => {
    setSelectedCertificate(certificate);
    setShowTransferModal(true);
  };

  // NOUVELLE FONCTION: Ouvrir le modal de vue détaillée
  const openCertificateModal = (certificate) => {
    setSelectedCertificate(certificate);
    setShowCertificateModal(true);
  };

  // Load certificates when account changes
  useEffect(() => {
    if (account) {
      loadUserCertificates();
    }
  }, [account]);

  // Load Ethers.js dynamically
  useEffect(() => {
    const loadEthers = async () => {
      if (typeof window.ethereum === 'undefined') {
        addLog('MetaMask not detected on page load', 'error');
      } else {
        addLog('MetaMask detected');
      }

      if (typeof window.ethers === 'undefined') {
        addLog('Loading Ethers.js...');
        try {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js';
          script.async = true;
          
          const scriptLoadPromise = new Promise((resolve, reject) => {
            script.onload = () => {
              setTimeout(() => {
                if (typeof window.ethers !== 'undefined') {
                  addLog('Ethers.js library is now available');
                  resolve();
                } else {
                  reject(new Error('Ethers.js not available after loading'));
                }
              }, 100);
            };
            script.onerror = () => reject(new Error('Failed to load Ethers.js'));
          });

          document.head.appendChild(script);
          await scriptLoadPromise;
          
        } catch (error) {
          addLog(`Error loading Ethers.js: ${error.message}`, 'error');
        }
      }
    };

    loadEthers();
  }, []);

  // NOUVEAU COMPOSANT: Modal de gestion des contacts
  const ContactsModal = () => (
    showContactsModal && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={24} />
              Carnet d'Adresses
            </h3>
            <button
              onClick={() => setShowContactsModal(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Boutons d'action */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowAddContact(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              + Ajouter Contact
            </button>
            <button
              onClick={discoverAccounts}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔍 Découvrir Comptes MetaMask
            </button>
          </div>
          
          {/* Formulaire d'ajout de contact */}
          {showAddContact && (
            <div style={{ 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              padding: '15px', 
              marginBottom: '20px',
              backgroundColor: '#f8f9fa'
            }}>
              <h4 style={{ margin: '0 0 15px 0' }}>Nouveau Contact</h4>
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Nom du contact"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}
                />
                <input
                  type="text"
                  placeholder="0x..."
                  value={newContactAddress}
                  onChange={(e) => setNewContactAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={addContact}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Ajouter
                </button>
                <button
                  onClick={() => setShowAddContact(false)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
          
          {/* Comptes MetaMask découverts */}
          {connectedAccounts.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>
                Comptes MetaMask Découverts ({connectedAccounts.length})
              </h4>
              {connectedAccounts.map((addr, index) => (
                <div key={addr} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '10px',
                  border: '1px solid #e3f2fd',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  backgroundColor: addr.toLowerCase() === account?.toLowerCase() ? '#e8f5e8' : '#f8f9fa'
                }}>
                  <div>
                    <p style={{ margin: '0', fontWeight: 'bold', fontSize: '14px' }}>
                      Compte {index + 1} {addr.toLowerCase() === account?.toLowerCase() && '(Actuel)'}
                    </p>
                    <p style={{ margin: '0', fontFamily: 'monospace', fontSize: '12px', color: '#666' }}>
                      {addr}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {!contacts.find(c => c.address.toLowerCase() === addr.toLowerCase()) && (
                      <button
                        onClick={() => addDiscoveredAccount(addr, index)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        + Contact
                      </button>
                    )}
                    <button
                      onClick={() => selectContactForTransfer({ address: addr, name: `Compte ${index + 1}` })}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Sélectionner
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Liste des contacts */}
          <div>
            <h4 style={{ margin: '0 0 15px 0' }}>
              Mes Contacts ({contacts.length})
            </h4>
            {contacts.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                Aucun contact enregistré.<br />
                Ajoutez des contacts pour faciliter les transferts !
              </p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {contacts.map((contact) => (
                  <div key={contact.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    backgroundColor: contact.isMetaMaskAccount ? '#fff3cd' : 'white'
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                        {contact.name}
                        {contact.isMetaMaskAccount && (
                          <span style={{ 
                            fontSize: '12px', 
                            color: '#856404', 
                            marginLeft: '8px',
                            backgroundColor: '#fff3cd',
                            padding: '2px 6px',
                            borderRadius: '3px'
                          }}>
                            MetaMask
                          </span>
                        )}
                      </p>
                      <p style={{ margin: '0', fontFamily: 'monospace', fontSize: '12px', color: '#666' }}>
                        {contact.address}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => selectContactForTransfer(contact)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Sélectionner
                      </button>
                      <button
                        onClick={() => removeContact(contact.id)}
                        style={{
                          padding: '6px 8px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  );
  const TransferModal = () => (
    showTransferModal && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ArrowRightLeft size={24} />
              Transférer le Certificat
            </h3>
            <button
              onClick={() => setShowTransferModal(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
          </div>
          
          {selectedCertificate && (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{selectedCertificate.fileName}</p>
              <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>ID: {selectedCertificate.id}</p>
            </div>
          )}
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <label style={{ fontWeight: 'bold' }}>
                Adresse du nouveau propriétaire
              </label>
              <button
                onClick={() => setShowContactsModal(true)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <User size={12} />
                Carnet d'adresses
              </button>
            </div>
            <input
              type="text"
              value={transferAddress}
              onChange={(e) => setTransferAddress(e.target.value)}
              placeholder="0x... ou sélectionnez dans le carnet d'adresses"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace'
              }}
            />
            {transferAddress && !isValidEthereumAddress(transferAddress) && (
              <p style={{ color: 'red', fontSize: '12px', margin: '5px 0 0 0' }}>
                Adresse Ethereum invalide
              </p>
            )}
            {transferAddress && isValidEthereumAddress(transferAddress) && (
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                {contacts.find(c => c.address.toLowerCase() === transferAddress.toLowerCase()) ? (
                  <p style={{ color: '#28a745', margin: 0 }}>
                    ✓ Contact: {contacts.find(c => c.address.toLowerCase() === transferAddress.toLowerCase()).name}
                  </p>
                ) : transferAddress.toLowerCase() === account?.toLowerCase() ? (
                  <p style={{ color: '#ffc107', margin: 0 }}>
                    ⚠️ C'est votre propre adresse
                  </p>
                ) : (
                  <p style={{ color: '#17a2b8', margin: 0 }}>
                    ℹ️ Nouvelle adresse (non dans vos contacts)
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowTransferModal(false)}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              Annuler
            </button>
            <button
              onClick={transferCertificate}
              disabled={transferLoading || !transferAddress || !isValidEthereumAddress(transferAddress)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: transferLoading ? '#ccc' : '#dc3545',
                color: 'white',
                cursor: transferLoading || !transferAddress || !isValidEthereumAddress(transferAddress) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {transferLoading ? (
                <>
                  <Clock size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Transfert...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Transférer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  );

  // NOUVEAU COMPOSANT: Modal de vue détaillée
  const CertificateModal = () => (
    showCertificateModal && selectedCertificate && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '90%',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={24} />
              Certificat de Propriété
            </h3>
            <button
              onClick={() => setShowCertificateModal(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
          </div>
          
          <div style={{ 
            border: '2px solid #007bff',
            borderRadius: '12px',
            padding: '25px',
            backgroundColor: '#f8f9fa',
            marginBottom: '20px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Shield size={48} color="#007bff" style={{ marginBottom: '10px' }} />
              <h4 style={{ margin: '0', color: '#007bff' }}>CERTIFICAT BLOCKCHAIN</h4>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                Document certifié sur la blockchain Ethereum
              </p>
            </div>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ fontWeight: 'bold', color: '#333' }}>Nom du fichier:</label>
                <p style={{ margin: '5px 0', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                  {selectedCertificate.fileName}
                </p>
              </div>
              
              <div>
                <label style={{ fontWeight: 'bold', color: '#333' }}>ID du certificat:</label>
                <p style={{ margin: '5px 0', padding: '8px', backgroundColor: 'white', borderRadius: '4px', fontFamily: 'monospace' }}>
                  #{selectedCertificate.id}
                </p>
              </div>
              
              <div>
                <label style={{ fontWeight: 'bold', color: '#333' }}>Propriétaire:</label>
                <p style={{ margin: '5px 0', padding: '8px', backgroundColor: 'white', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}>
                  {selectedCertificate.owner}
                </p>
              </div>
              
              <div>
                <label style={{ fontWeight: 'bold', color: '#333' }}>Hash SHA-256:</label>
                <p style={{ margin: '5px 0', padding: '8px', backgroundColor: 'white', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>
                  {selectedCertificate.hash}
                </p>
              </div>
              
              <div>
                <label style={{ fontWeight: 'bold', color: '#333' }}>Date de création:</label>
                <p style={{ margin: '5px 0', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                  {selectedCertificate.date.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
              <CheckCircle size={20} color="#28a745" style={{ marginRight: '8px' }} />
              <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                Certificat vérifié et authentique
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => openTransferModal(selectedCertificate)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: '#dc3545',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ArrowRightLeft size={16} />
              Transférer
            </button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Debug Log */}
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '15px', 
        marginBottom: '20px',
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Journal de Debug</h3>
        {debugLog.length === 0 ? (
          <p style={{ margin: 0, color: '#666', fontStyle: 'italic' }}>Aucun log pour le moment...</p>
        ) : (
          debugLog.map((log, index) => (
            <div key={index} style={{ 
              fontSize: '12px', 
              fontFamily: 'monospace', 
              marginBottom: '2px',
              color: log.includes('ERROR') ? 'red' : log.includes('WARNING') ? 'orange' : 'black'
            }}>
              {log}
            </div>
          ))
        )}
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: 0 }}>
          <Shield size={40} />
          Certificat de Propriété Blockchain
        </h1>
        <p style={{ color: '#666', margin: '10px 0 0 0' }}>
          Protégez vos documents avec la technologie blockchain
        </p>
      </div>

      {/* Wallet Connection */}
      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '20px', 
        marginBottom: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={20} />
            Connexion Wallet
          </h3>
          {account && (
            <div style={{ 
              padding: '5px 10px', 
              backgroundColor: '#d4edda', 
              borderRadius: '20px', 
              fontSize: '12px',
              color: '#155724'
            }}>
              Connecté
            </div>
          )}
        </div>
        
        {!account ? (
          <button
            onClick={connectWallet}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontSize: '16px'
            }}
          >
            <User size={20} />
            Connecter MetaMask
          </button>
        ) : (
          <div>
            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Compte connecté:</p>
            <p style={{ 
              margin: 0, 
              fontFamily: 'monospace', 
              fontSize: '14px', 
              padding: '8px', 
              backgroundColor: 'white', 
              borderRadius: '4px',
              wordBreak: 'break-all'
            }}>
              {account}
            </p>
          </div>
        )}
      </div>

      {/* File Upload Section */}
      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '20px', 
        marginBottom: '20px' 
      }}>
        <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Upload size={20} />
          Sélectionner un Fichier
        </h3>
        
        <input
          id="fileInput"
          type="file"
          onChange={handleFileUpload}
          style={{
            width: '100%',
            padding: '12px',
            border: '2px dashed #ddd',
            borderRadius: '6px',
            backgroundColor: '#f9f9f9',
            marginBottom: '15px'
          }}
        />
        
        {file && (
          <div style={{ 
            backgroundColor: '#e7f3ff', 
            padding: '15px', 
            borderRadius: '6px',
            marginBottom: '15px'
          }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>Fichier sélectionné:</p>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>{file.name}</p>
            {isHashing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#007bff' }}>
                <Clock size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Calcul du hash en cours...
              </div>
            ) : fileHash && (
              <div>
                <p style={{ margin: '10px 0 5px 0', fontWeight: 'bold' }}>Hash SHA-256:</p>
                <p style={{ 
                  margin: 0, 
                  fontFamily: 'monospace', 
                  fontSize: '12px', 
                  wordBreak: 'break-all',
                  padding: '8px',
                  backgroundColor: 'white',
                  borderRadius: '4px'
                }}>
                  {fileHash}
                </p>
              </div>
            )}
          </div>
        )}
        
        {file && fileHash && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={registerCertificate}
              disabled={loading || !account}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: loading || !account ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading || !account ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <Clock size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Enregistrement...
                </>
              ) : (
                <>
                  <FileCheck size={16} />
                  Certifier le Document
                </>
              )}
            </button>
            
            <button
              onClick={verifyCertificate}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Shield size={16} />
              Vérifier
            </button>
          </div>
        )}
      </div>

      {/* Verification Result */}
      {verificationResult && (
        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '20px', 
          marginBottom: '20px',
          backgroundColor: verificationResult.exists ? '#d4edda' : '#f8d7da'
        }}>
          <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {verificationResult.exists ? (
              <>
                <CheckCircle size={20} color="#28a745" />
                Certificat Trouvé
              </>
            ) : (
              <>
                <AlertCircle size={20} color="#dc3545" />
                Certificat Non Trouvé
              </>
            )}
          </h3>
          
          {verificationResult.exists ? (
            <div>
              <p style={{ margin: '0 0 10px 0' }}>
                Ce document est certifié sur la blockchain !
              </p>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Propriétaire:</p>
              <p style={{ 
                margin: '0 0 10px 0', 
                fontFamily: 'monospace', 
                fontSize: '14px',
                padding: '8px',
                backgroundColor: 'white',
                borderRadius: '4px'
              }}>
                {verificationResult.owner}
              </p>
              {verificationResult.isOwner && (
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: '#d1ecf1', 
                  borderRadius: '4px',
                  color: '#0c5460'
                }}>
                  <strong>✓ Vous êtes le propriétaire de ce certificat</strong>
                </div>
              )}
            </div>
          ) : (
            <p style={{ margin: 0 }}>
              Ce document n'est pas encore certifié sur la blockchain.
            </p>
          )}
        </div>
      )}

      {/* User Certificates */}
      {account && (
        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '20px', 
          marginBottom: '20px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={20} />
              Mes Certificats ({certificates.length})
            </h3>
            <button
              onClick={loadUserCertificates}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Actualiser
            </button>
          </div>
          
          {certificates.length === 0 ? (
            <p style={{ margin: 0, color: '#666', fontStyle: 'italic' }}>
              Aucun certificat trouvé. Certifiez votre premier document !
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {certificates.map((cert) => (
                <div key={cert.id} style={{ 
                  border: '1px solid #e9ecef', 
                  borderRadius: '8px', 
                  padding: '15px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{cert.fileName}</h4>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>
                        ID: #{cert.id}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                        Créé le: {cert.date.toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openCertificateModal(cert)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Eye size={14} />
                        Voir
                      </button>
                      <button
                        onClick={() => openTransferModal(cert)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <ArrowRightLeft size={14} />
                        Transférer
                      </button>
                    </div>
                  </div>
                  <div>
                    <p style={{ margin: '5px 0', fontSize: '11px', color: '#666' }}>Hash:</p>
                    <p style={{ 
                      margin: 0, 
                      fontFamily: 'monospace', 
                      fontSize: '10px', 
                      wordBreak: 'break-all',
                      color: '#495057'
                    }}>
                      {cert.hash}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contract Info */}
      <div style={{ 
        backgroundColor: '#e9ecef', 
        padding: '15px', 
        borderRadius: '8px',
        fontSize: '12px',
        color: '#495057'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Hash size={16} />
          <strong>Informations du Contrat</strong>
        </div>
        <p style={{ margin: '0 0 5px 0' }}>
          <strong>Adresse:</strong> {contractAddress}
        </p>
        <p style={{ margin: '0 0 5px 0' }}>
          <strong>Réseau:</strong> Hardhat Local (Chain ID: 31337)
        </p>
        <p style={{ margin: 0 }}>
          <strong>Port RPC:</strong> http://127.0.0.1:8545
        </p>
      </div>

      {/* Modals */}
      <ContactsModal />
      <TransferModal />
      <CertificateModal />
      
      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CertificateApp;