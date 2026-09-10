// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

interface IRecyclingGovernor {
    enum ProposalState {
        Pending,
        Active,
        Succeeded,
        Defeated,
        Executed,
        Cancelled
    }

    struct Proposal {
        uint256 id;
        address deadToken;
        address[] candidates;
        uint256 startTime;
        uint256 endTime;
        address winner;
        bool executed;
        bool cancelled;
    }

    function propose(address deadToken, address[] calldata candidates) external returns (uint256 proposalId);

    function vote(uint256 proposalId, address candidate) external payable;

    function execute(uint256 proposalId) external returns (address winner);

    function getProposal(uint256 proposalId) external view returns (Proposal memory);

    function votes(uint256 proposalId, address candidate) external view returns (uint256);

    function state(uint256 proposalId) external view returns (ProposalState);
}
