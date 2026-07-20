// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TourifyPassportRegistry
 * @notice Minimal nonfinancial attestation registry for Tourify Rights Passports.
 * @dev Testnet-first (Sepolia). No audio, names, private shares, contracts, PII,
 *      evidence URLs, or signatures are stored on-chain. Not an NFT, ownership
 *      token, royalty contract, or copyright office.
 *
 * Roles (OpenZeppelin AccessControl-style sketch):
 * - DEFAULT_ADMIN_ROLE / REGISTRY_ADMIN_ROLE: register/revoke issuers; intended multisig
 * - ISSUER_ROLE: anchor and supersede passport commitments
 * - STATUS_OPERATOR_ROLE: suspend / reactivate / revoke
 * - EMERGENCY_PAUSER_ROLE: pause registry operations
 *
 * Pin audited OpenZeppelin contracts before production deployment.
 */

interface IAccessControlSketch {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
}

contract TourifyPassportRegistry {
    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant STATUS_OPERATOR_ROLE = keccak256("STATUS_OPERATOR_ROLE");
    bytes32 public constant EMERGENCY_PAUSER_ROLE = keccak256("EMERGENCY_PAUSER_ROLE");
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    enum PassportStatus {
        Active,
        Suspended,
        Revoked,
        Superseded
    }

    struct PassportRecord {
        bytes32 passportPublicIdHash;
        uint64 passportVersion;
        bytes32 publicManifestHash;
        bytes32 privateManifestCommitment;
        bytes32 credentialHash;
        bytes32 schemaVersion;
        bytes32 issuer;
        uint64 issuedAt;
        PassportStatus status;
        uint64 supersededByVersion;
        bytes32 reasonHash;
        bool exists;
    }

    mapping(bytes32 => mapping(uint64 => PassportRecord)) private _records;
    mapping(bytes32 => uint64) private _latestVersion;
    mapping(bytes32 => bool) private _issuers;
    mapping(bytes32 => mapping(address => bool)) private _roles;

    address public admin;
    bool public paused;

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event IssuerRegistered(bytes32 indexed issuer, address indexed operator);
    event IssuerRevoked(bytes32 indexed issuer, address indexed operator);
    event PassportAnchored(bytes32 indexed passportPublicIdHash, uint64 version, bytes32 publicManifestHash);
    event PassportSuperseded(bytes32 indexed passportPublicIdHash, uint64 version, uint64 supersededByVersion);
    event PassportSuspended(bytes32 indexed passportPublicIdHash, uint64 version, bytes32 reasonHash);
    event PassportReactivated(bytes32 indexed passportPublicIdHash, uint64 version);
    event PassportRevoked(bytes32 indexed passportPublicIdHash, uint64 version, bytes32 reasonHash);
    event Paused(address indexed account);
    event Unpaused(address indexed account);

    modifier onlyRole(bytes32 role) {
        require(_roles[role][msg.sender] || (role == DEFAULT_ADMIN_ROLE && msg.sender == admin), "missing role");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }

    constructor(address adminMultisig) {
        require(adminMultisig != address(0), "admin required");
        admin = adminMultisig;
        _roles[DEFAULT_ADMIN_ROLE][adminMultisig] = true;
        _roles[REGISTRY_ADMIN_ROLE][adminMultisig] = true;
        _roles[EMERGENCY_PAUSER_ROLE][adminMultisig] = true;
        emit RoleGranted(DEFAULT_ADMIN_ROLE, adminMultisig, msg.sender);
        emit RoleGranted(REGISTRY_ADMIN_ROLE, adminMultisig, msg.sender);
        emit RoleGranted(EMERGENCY_PAUSER_ROLE, adminMultisig, msg.sender);
    }

    function grantRole(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _roles[role][account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account] || (role == DEFAULT_ADMIN_ROLE && account == admin);
    }

    function pause() external onlyRole(EMERGENCY_PAUSER_ROLE) {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyRole(EMERGENCY_PAUSER_ROLE) {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function registerIssuer(bytes32 issuer) external onlyRole(REGISTRY_ADMIN_ROLE) {
        _issuers[issuer] = true;
        emit IssuerRegistered(issuer, msg.sender);
    }

    function revokeIssuer(bytes32 issuer) external onlyRole(REGISTRY_ADMIN_ROLE) {
        _issuers[issuer] = false;
        emit IssuerRevoked(issuer, msg.sender);
    }

    function anchorPassport(
        bytes32 passportPublicIdHash,
        uint64 passportVersion,
        bytes32 publicManifestHash,
        bytes32 privateManifestCommitment,
        bytes32 credentialHash,
        bytes32 schemaVersion,
        bytes32 issuer,
        uint64 issuedAt
    ) external onlyRole(ISSUER_ROLE) whenNotPaused {
        require(_issuers[issuer], "unknown issuer");
        require(passportVersion > 0, "version");
        require(!_records[passportPublicIdHash][passportVersion].exists, "already anchored");

        _records[passportPublicIdHash][passportVersion] = PassportRecord({
            passportPublicIdHash: passportPublicIdHash,
            passportVersion: passportVersion,
            publicManifestHash: publicManifestHash,
            privateManifestCommitment: privateManifestCommitment,
            credentialHash: credentialHash,
            schemaVersion: schemaVersion,
            issuer: issuer,
            issuedAt: issuedAt,
            status: PassportStatus.Active,
            supersededByVersion: 0,
            reasonHash: bytes32(0),
            exists: true
        });

        if (passportVersion > _latestVersion[passportPublicIdHash]) {
            _latestVersion[passportPublicIdHash] = passportVersion;
        }

        emit PassportAnchored(passportPublicIdHash, passportVersion, publicManifestHash);
    }

    function supersedePassport(
        bytes32 passportPublicIdHash,
        uint64 passportVersion,
        uint64 supersededByVersion,
        bytes32 reasonHash
    ) external onlyRole(ISSUER_ROLE) whenNotPaused {
        PassportRecord storage record = _requireRecord(passportPublicIdHash, passportVersion);
        record.status = PassportStatus.Superseded;
        record.supersededByVersion = supersededByVersion;
        record.reasonHash = reasonHash;
        emit PassportSuperseded(passportPublicIdHash, passportVersion, supersededByVersion);
    }

    function suspendPassport(
        bytes32 passportPublicIdHash,
        uint64 passportVersion,
        bytes32 reasonHash
    ) external onlyRole(STATUS_OPERATOR_ROLE) whenNotPaused {
        PassportRecord storage record = _requireRecord(passportPublicIdHash, passportVersion);
        record.status = PassportStatus.Suspended;
        record.reasonHash = reasonHash;
        emit PassportSuspended(passportPublicIdHash, passportVersion, reasonHash);
    }

    function reactivatePassport(
        bytes32 passportPublicIdHash,
        uint64 passportVersion
    ) external onlyRole(STATUS_OPERATOR_ROLE) whenNotPaused {
        PassportRecord storage record = _requireRecord(passportPublicIdHash, passportVersion);
        require(record.status == PassportStatus.Suspended, "not suspended");
        record.status = PassportStatus.Active;
        record.reasonHash = bytes32(0);
        emit PassportReactivated(passportPublicIdHash, passportVersion);
    }

    function revokePassport(
        bytes32 passportPublicIdHash,
        uint64 passportVersion,
        bytes32 reasonHash
    ) external onlyRole(STATUS_OPERATOR_ROLE) whenNotPaused {
        PassportRecord storage record = _requireRecord(passportPublicIdHash, passportVersion);
        record.status = PassportStatus.Revoked;
        record.reasonHash = reasonHash;
        emit PassportRevoked(passportPublicIdHash, passportVersion, reasonHash);
    }

    function getPassportStatus(bytes32 passportPublicIdHash, uint64 passportVersion)
        external
        view
        returns (PassportStatus status, bool exists)
    {
        PassportRecord storage record = _records[passportPublicIdHash][passportVersion];
        return (record.status, record.exists);
    }

    function getLatestVersion(bytes32 passportPublicIdHash) external view returns (uint64) {
        return _latestVersion[passportPublicIdHash];
    }

    function _requireRecord(bytes32 passportPublicIdHash, uint64 passportVersion)
        internal
        view
        returns (PassportRecord storage record)
    {
        record = _records[passportPublicIdHash][passportVersion];
        require(record.exists, "missing");
    }
}
