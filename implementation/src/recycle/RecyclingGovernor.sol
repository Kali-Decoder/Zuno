// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IRecyclingGovernor} from "./interfaces/IRecyclingGovernor.sol";
import {IActivityMonitor} from "./interfaces/IActivityMonitor.sol";
import {ILPRecyclingVault} from "./interfaces/ILPRecyclingVault.sol";

/// @notice Community votes (native-weighted) on which active listed project receives recycled LP.
contract RecyclingGovernor is Ownable, ReentrancyGuard, IRecyclingGovernor {
    IActivityMonitor public activityMonitor;
    ILPRecyclingVault public vault;

    uint256 public votingPeriod = 3 days;
    uint256 public proposalCount;
    uint256 public minVoteStake = 0.01 ether;

    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => mapping(address => uint256)) private _votes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) private _isCandidate;

    error Unauthorized();
    error NotEligible();
    error InvalidCandidate();
    error AlreadyVoted();
    error NotActive();
    error NotSucceeded();
    error AlreadyExecuted();
    error InsufficientStake();

    event ProposalCreated(uint256 indexed id, address indexed deadToken, address[] candidates, uint256 endTime);
    event Voted(uint256 indexed id, address indexed voter, address indexed candidate, uint256 weight);
    event ProposalExecuted(uint256 indexed id, address indexed winner, uint256 nativeRecycled, uint256 newLiquidity);

    constructor() Ownable(msg.sender) {}

    function setActivityMonitor(address m) external onlyOwner {
        activityMonitor = IActivityMonitor(m);
    }

    function setVault(address v) external onlyOwner {
        vault = ILPRecyclingVault(v);
    }

    function setVotingPeriod(uint256 period) external onlyOwner {
        votingPeriod = period;
    }

    function setMinVoteStake(uint256 stake) external onlyOwner {
        minVoteStake = stake;
    }

    function propose(address deadToken, address[] calldata candidates)
        external
        nonReentrant
        returns (uint256 proposalId)
    {
        if (!activityMonitor.isRecyclingEligible(deadToken)) revert NotEligible();

        ILPRecyclingVault.LockedLP memory deadPos = vault.getPosition(deadToken);
        if (deadPos.status == ILPRecyclingVault.PositionStatus.Locked) {
            vault.markInactive(deadToken);
            deadPos = vault.getPosition(deadToken);
        }
        if (deadPos.status != ILPRecyclingVault.PositionStatus.Inactive) revert NotEligible();

        if (candidates.length == 0) revert InvalidCandidate();
        for (uint256 i = 0; i < candidates.length; i++) {
            if (candidates[i] == deadToken) revert InvalidCandidate();
            if (!vault.isLocked(candidates[i])) revert InvalidCandidate();
        }

        proposalId = ++proposalCount;
        Proposal storage p = _proposals[proposalId];
        p.id = proposalId;
        p.deadToken = deadToken;
        p.candidates = candidates;
        p.startTime = block.timestamp;
        p.endTime = block.timestamp + votingPeriod;

        for (uint256 i = 0; i < candidates.length; i++) {
            _isCandidate[proposalId][candidates[i]] = true;
        }

        emit ProposalCreated(proposalId, deadToken, candidates, p.endTime);
    }

    function vote(uint256 proposalId, address candidate) external payable nonReentrant {
        Proposal storage p = _proposals[proposalId];
        if (block.timestamp < p.startTime || block.timestamp > p.endTime || p.cancelled || p.executed) {
            revert NotActive();
        }
        if (!_isCandidate[proposalId][candidate]) revert InvalidCandidate();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();
        if (msg.value < minVoteStake) revert InsufficientStake();

        hasVoted[proposalId][msg.sender] = true;
        _votes[proposalId][candidate] += msg.value;

        emit Voted(proposalId, msg.sender, candidate, msg.value);
    }

    function execute(uint256 proposalId) external nonReentrant returns (address winner) {
        if (state(proposalId) != ProposalState.Succeeded) revert NotSucceeded();
        Proposal storage p = _proposals[proposalId];
        if (p.executed) revert AlreadyExecuted();

        winner = _leadingCandidate(proposalId);
        if (winner == address(0)) revert InvalidCandidate();

        p.winner = winner;
        p.executed = true;

        (uint256 nativeRecycled, uint256 newLiquidity) = vault.recycleToWinner(p.deadToken, winner);
        emit ProposalExecuted(proposalId, winner, nativeRecycled, newLiquidity);
    }

    function cancel(uint256 proposalId) external onlyOwner {
        _proposals[proposalId].cancelled = true;
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return _proposals[proposalId];
    }

    function votes(uint256 proposalId, address candidate) external view returns (uint256) {
        return _votes[proposalId][candidate];
    }

    function state(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert Unauthorized();
        if (p.cancelled) return ProposalState.Cancelled;
        if (p.executed) return ProposalState.Executed;
        if (block.timestamp < p.startTime) return ProposalState.Pending;
        if (block.timestamp <= p.endTime) return ProposalState.Active;

        address lead = _leadingCandidate(proposalId);
        if (lead == address(0) || _votes[proposalId][lead] == 0) return ProposalState.Defeated;
        return ProposalState.Succeeded;
    }

    function _leadingCandidate(uint256 proposalId) internal view returns (address lead) {
        Proposal storage p = _proposals[proposalId];
        uint256 best;
        for (uint256 i = 0; i < p.candidates.length; i++) {
            address c = p.candidates[i];
            uint256 v = _votes[proposalId][c];
            if (v > best) {
                best = v;
                lead = c;
            }
        }
    }

    function withdrawStakes(address to) external onlyOwner {
        (bool ok,) = to.call{value: address(this).balance}("");
        require(ok, "WITHDRAW");
    }

    receive() external payable {}
}
