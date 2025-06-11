import React, { useState, useEffect } from 'react';
import { Upload, FileCheck, Shield, AlertCircle, CheckCircle, Clock, User, Hash, FileText } from 'lucide-react';

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

  // Enhanced logging function
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logEntry);
    setDebugLog(prev => [...prev.slice(-9), logEntry]); // Keep last 10 logs
  };

  // ABI du contrat simplifié
  const contractABI = [
    "function enregistrerCertificat(string memory _hashFichier, string memory _nomFichier) public",
    "function obtenirCertificat(uint256 _id) public view returns (uint256 id, string memory hashFichier, address proprietaire, string memory nomFichier, uint256 dateCreation)",
    "function verifierProprietaireParHash(string memory _hashFichier) public view returns (address proprietaire, bool existe)",
    "function obtenirCertificatsProprietaire(address _proprietaire) public view returns (uint256[] memory)",
    "event CertificatCree(uint256 indexed id, string hashFichier, address indexed proprietaire, string nomFichier)"
  ];

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

  // Enhanced wallet connection with Ethers.js loading check
  const connectWallet = async () => {
    addLog('Attempting to connect wallet...');
    
    if (typeof window.ethereum === 'undefined') {
      addLog('MetaMask not detected', 'error');
      alert('MetaMask non détecté ! Veuillez installer MetaMask.');
      return;
    }

    // Wait for Ethers.js to be available
    if (typeof window.ethers === 'undefined') {
      addLog('Ethers.js not loaded, attempting to load...', 'warning');
      alert('Ethers.js en cours de chargement... Veuillez patienter et réessayer dans quelques secondes.');
      
      // Try to load it again
      try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js';
        script.async = false; // Load synchronously
        document.head.appendChild(script);
        
        // Wait for it to load
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(() => reject(new Error('Timeout')), 10000);
        });
        
        // Check again
        if (typeof window.ethers === 'undefined') {
          addLog('Ethers.js still not available after loading attempt', 'error');
          alert('Impossible de charger Ethers.js. Rechargez la page.');
          return;
        }
        addLog('Ethers.js loaded successfully on retry');
      } catch (error) {
        addLog(`Failed to load Ethers.js: ${error.message}`, 'error');
        alert('Impossible de charger Ethers.js. Rechargez la page.');
        return;
      }
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
          // If network doesn't exist, add it
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
    
    // Enhanced validation
    if (!file) {
      addLog('No file selected', 'error');
      alert('Veuillez sélectionner un fichier');
      return;
    }
    
    if (!fileHash) {
      addLog('No file hash available', 'error');
      alert('Hash du fichier non disponible');
      return;
    }
    
    if (!account) {
      addLog('No wallet connected', 'error');
      alert('Veuillez connecter votre wallet');
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
      // Check if provider is available
      addLog('Creating provider...');
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      
      // Check network
      const network = await provider.getNetwork();
      addLog(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
      
      if (network.chainId !== 31337) {
        addLog(`Wrong network: expected 31337, got ${network.chainId}`, 'error');
        alert('Veuillez vous connecter au réseau Hardhat Local (chainId: 31337)');
        return;
      }

      // Get signer
      addLog('Getting signer...');
      const signer = provider.getSigner();
      const signerAddress = await signer.getAddress();
      addLog(`Signer address: ${signerAddress}`);

      // Check balance
      const balance = await provider.getBalance(signerAddress);
      addLog(`Account balance: ${window.ethers.utils.formatEther(balance)} ETH`);
      
      if (balance.isZero()) {
        addLog('Insufficient balance', 'error');
        alert('Solde insuffisant. Assurez-vous d\'avoir des ETH sur le réseau Hardhat.');
        return;
      }

      // Create contract instance
      addLog(`Creating contract instance at address: ${contractAddress}`);
      const contract = new window.ethers.Contract(contractAddress, contractABI, signer);
      
      // Check if contract exists
      try {
        const code = await provider.getCode(contractAddress);
        if (code === '0x') {
          addLog('Contract not deployed at specified address', 'error');
          alert(`Aucun contrat déployé à l'adresse: ${contractAddress}`);
          return;
        }
        addLog('Contract found at specified address');
      } catch (codeError) {
        addLog(`Error checking contract: ${codeError.message}`, 'error');
        alert('Erreur lors de la vérification du contrat: ' + codeError.message);
        return;
      }

      // Estimate gas
      addLog('Estimating gas...');
      try {
        const gasEstimate = await contract.estimateGas.enregistrerCertificat(fileHash, file.name);
        addLog(`Gas estimate: ${gasEstimate.toString()}`);
      } catch (gasError) {
        addLog(`Gas estimation failed: ${gasError.message}`, 'error');
        // Continue anyway, might be a view function issue
      }

      // Send transaction
      addLog('Sending transaction...');
      const tx = await contract.enregistrerCertificat(fileHash, file.name);
      addLog(`Transaction sent: ${tx.hash}`);
      
      addLog('Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      addLog(`Transaction confirmed in block: ${receipt.blockNumber}`);
      addLog(`Gas used: ${receipt.gasUsed.toString()}`);

      alert('Certificat enregistré avec succès !');
      loadUserCertificates();
      
      // Reset form
      setFile(null);
      setFileHash('');
      const fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.value = '';
      
      addLog('Certificate registration completed successfully');
    } catch (error) {
      addLog(`Registration error: ${error.message}`, 'error');
      console.error('Erreur complète:', error);
      
      // Enhanced error handling
      if (error.message.includes('Ce fichier est deja certifie')) {
        alert('Ce fichier est déjà certifié !');
      } else if (error.message.includes('user rejected')) {
        alert('Transaction annulée par l\'utilisateur');
      } else if (error.message.includes('insufficient funds')) {
        alert('Fonds insuffisants pour cette transaction');
      } else if (error.message.includes('execution reverted')) {
        alert('Transaction échouée: ' + error.message);
      } else if (error.message.includes('network')) {
        alert('Erreur réseau: Vérifiez votre connexion à Hardhat');
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
      addLog('No hash available for verification', 'error');
      alert('Veuillez d\'abord sélectionner un fichier');
      return;
    }

    addLog(`Starting verification for hash: ${fileHash}`);

    try {
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const contract = new window.ethers.Contract(contractAddress, contractABI, provider);

      addLog('Calling verifierProprietaireParHash...');
      const [owner, exists] = await contract.verifierProprietaireParHash(fileHash);
      
      addLog(`Verification result - exists: ${exists}, owner: ${owner}`);
      
      setVerificationResult({
        exists,
        owner: exists ? owner : null,
        isOwner: exists && account && owner.toLowerCase() === account.toLowerCase()
      });
    } catch (error) {
      addLog(`Verification error: ${error.message}`, 'error');
      console.error('Erreur:', error);
      alert('Erreur lors de la vérification: ' + error.message);
    }
  };

  // Enhanced certificate loading
  const loadUserCertificates = async () => {
    if (!account) {
      addLog('No account connected for loading certificates', 'warning');
      return;
    }

    addLog(`Loading certificates for account: ${account}`);

    try {
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const contract = new window.ethers.Contract(contractAddress, contractABI, provider);

      addLog('Getting certificate IDs...');
      const certificateIds = await contract.obtenirCertificatsProprietaire(account);
      addLog(`Found ${certificateIds.length} certificate IDs`);

      const certificateDetails = await Promise.all(
        certificateIds.map(async (id) => {
          try {
            addLog(`Loading details for certificate ID: ${id.toString()}`);
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
      addLog(`Loaded ${validCertificates.length} valid certificates`);
      setCertificates(validCertificates);
    } catch (error) {
      addLog(`Error loading certificates: ${error.message}`, 'error');
      console.error('Erreur lors du chargement:', error);
    }
  };

  // Load certificates when account changes
  useEffect(() => {
    if (account) {
      addLog(`Account changed to: ${account}`);
      loadUserCertificates();
    }
  }, [account]);

  // Load Ethers.js dynamically and check availability
  useEffect(() => {
    const loadEthers = async () => {
      // Check MetaMask
      if (typeof window.ethereum === 'undefined') {
        addLog('MetaMask not detected on page load', 'error');
        alert('Veuillez installer MetaMask pour utiliser cette application');
      } else {
        addLog('MetaMask detected');
      }

      // Load Ethers.js if not already loaded
      if (typeof window.ethers === 'undefined') {
        addLog('Loading Ethers.js...');
        try {
          // Create and load the script
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js';
          script.async = true;
          
          // Promise to wait for script to load
          const scriptLoadPromise = new Promise((resolve, reject) => {
            script.onload = () => {
              addLog('Ethers.js CDN script loaded');
              // Wait a bit more for the library to be available
              setTimeout(() => {
                if (typeof window.ethers !== 'undefined') {
                  addLog('Ethers.js library is now available');
                  resolve();
                } else {
                  addLog('Ethers.js library still not available after loading', 'error');
                  reject(new Error('Ethers.js not available after loading'));
                }
              }, 100);
            };
            script.onerror = () => {
              addLog('Failed to load Ethers.js CDN script', 'error');
              reject(new Error('Failed to load Ethers.js'));
            };
          });

          // Add script to document
          document.head.appendChild(script);
          
          // Wait for loading
          await scriptLoadPromise;
          addLog('Ethers.js loaded successfully');
          
        } catch (error) {
          addLog(`Error loading Ethers.js: ${error.message}`, 'error');
          alert('Impossible de charger Ethers.js. Vérifiez votre connexion internet.');
        }
      } else {
        addLog('Ethers.js already loaded');
      }
    };

    loadEthers();
  }, []);

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
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Debug Log:</h3>
        {debugLog.length === 0 ? (
          <p style={{ margin: 0, color: '#666', fontStyle: 'italic' }}>No logs yet...</p>
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
        backgroundColor: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={20} />
            <span>
              {account ? `Connecté: ${account.slice(0, 6)}...${account.slice(-4)}` : 'Wallet non connecté'}
            </span>
          </div>
          {!account && (
            <button 
              onClick={connectWallet} 
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Connecter MetaMask
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        {/* Upload Section */}
        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '20px',
          backgroundColor: 'white'
        }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
            <Upload size={24} />
            Certifier un Document
          </h2>

          {/* File Upload */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Sélectionner votre fichier
            </label>
            <input
              id="fileInput"
              type="file"
              onChange={handleFileUpload}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                backgroundColor: '#f9f9f9'
              }}
              accept="*/*"
            />
          </div>

          {/* File Info */}
          {file && (
            <div style={{ 
              border: '1px solid #e0e0e0', 
              borderRadius: '5px', 
              padding: '15px', 
              marginBottom: '20px',
              backgroundColor: '#f9f9f9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <FileText size={20} />
                <span style={{ fontWeight: 'bold' }}>{file.name}</span>
                <span style={{ color: '#666' }}>
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              
              {isHashing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#007bff' }}>
                  <Clock size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Calcul du hash en cours...</span>
                </div>
              )}
              
              {fileHash && !isHashing && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <Hash size={20} />
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Hash SHA-256:</p>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '12px', 
                      fontFamily: 'monospace', 
                      wordBreak: 'break-all',
                      backgroundColor: '#f0f0f0',
                      padding: '5px',
                      borderRadius: '3px'
                    }}>
                      {fileHash}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={registerCertificate}
              disabled={!file || !fileHash || !account || loading}
              style={{
                backgroundColor: loading ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '5px',
                cursor: loading || !file || !fileHash || !account ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '16px'
              }}
            >
              {loading ? (
                <>
                  <Clock size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Certifier
                </>
              )}
            </button>

            <button
              onClick={verifyCertificate}
              disabled={!fileHash}
              style={{
                backgroundColor: !fileHash ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '5px',
                cursor: !fileHash ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '16px'
              }}
            >
              <FileCheck size={16} />
              Vérifier
            </button>
          </div>

          {/* Verification Result */}
          {verificationResult && (
            <div style={{ 
              marginTop: '20px',
              padding: '15px',
              borderRadius: '5px',
              border: `1px solid ${verificationResult.exists ? '#28a745' : '#dc3545'}`,
              backgroundColor: verificationResult.exists ? '#d4edda' : '#f8d7da'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                {verificationResult.exists ? (
                  <CheckCircle size={20} color="#28a745" />
                ) : (
                  <AlertCircle size={20} color="#dc3545" />
                )}
                <span style={{ 
                  fontWeight: 'bold',
                  color: verificationResult.exists ? '#28a745' : '#dc3545'
                }}>
                  {verificationResult.exists ? 'Document Certifié ✓' : 'Document Non Certifié ✗'}
                </span>
              </div>
              
              {verificationResult.exists && (
                <div>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    Propriétaire: {verificationResult.owner}
                  </p>
                  {verificationResult.isOwner && (
                    <p style={{ margin: '5px 0', color: '#28a745', fontWeight: 'bold' }}>
                      ✓ Vous êtes le propriétaire de ce document
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* My Certificates */}
        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '20px',
          backgroundColor: 'white'
        }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
            <FileCheck size={24} />
            Mes Certificats ({certificates.length})
          </h2>

          {account ? (
            <div>
              {certificates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  <FileText size={48} style={{ marginBottom: '10px' }} />
                  <p style={{ fontWeight: 'bold', margin: '10px 0 5px 0' }}>Aucun certificat trouvé</p>
                  <p style={{ margin: 0 }}>Certifiez votre premier document !</p>
                </div>
              ) : (
                certificates.map((cert, index) => (
                  <div key={index} style={{ 
                    border: '1px solid #e0e0e0',
                    borderRadius: '5px',
                    padding: '15px',
                    marginBottom: '10px',
                    backgroundColor: '#f9f9f9'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={16} />
                        <span style={{ fontWeight: 'bold' }}>{cert.fileName}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        ID: {cert.id}
                      </span>
                    </div>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                      {cert.date.toLocaleDateString('fr-FR')} à {cert.date.toLocaleTimeString('fr-FR')}
                    </p>
                    <p style={{ 
                      margin: '5px 0', 
                      fontSize: '12px', 
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      color: '#555'
                    }}>
                      Hash: {cert.hash}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <User size={48} style={{ marginBottom: '10px', color: '#666' }} />
              <p style={{ fontWeight: 'bold', margin: '10px 0' }}>Connectez votre wallet</p>
              <button 
                onClick={connectWallet}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Connecter MetaMask
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '20px', 
        marginTop: '20px',
        backgroundColor: 'white'
      }}>
        <h3 style={{ marginTop: 0 }}>Instructions:</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div>
            <p><strong>1. Connecter MetaMask:</strong> Utilisez le réseau Hardhat Local</p>
            <p><strong>2. Sélectionner un fichier:</strong> Le hash sera calculé automatiquement</p>
            <p><strong>3. Certifier:</strong> Enregistre le document sur la blockchain</p>
          </div>
          <div>
            <p><strong>4. Vérifier:</strong> Contrôle si un document est déjà certifié</p>
            <p><strong>5. Mes Certificats:</strong> Liste de tous vos documents certifiés</p>
            <p><strong>Adresse du contrat:</strong> {contractAddress}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateApp;