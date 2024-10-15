---
title: 'Decentralized Loop Removal'
docname: draft-dejong-decentralized-loop-removal-00
category: std

ipr: trust200902
area: Security
keyword: Internet-Draft

stand_alone: yes

author:
  - ins: M.B. de Jong
    name: Michiel de Jong
    organization: Ponder Source
    email: michiel@pondersource.com
    uri: https://pondersource.com

--- abstract

Decentralized Loop Removal is an algorithm for finding and removing
loops in directed graphs using a node-to-node messaging protocol.
It differs from some other cycle finding algorithms in that it does not require
a central coordinator, or a bird's-eye view of the graph.

This is a first version of this Internet Draft, and it is still expected to evolve significantly from here.
--- middle

# Terms
The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL
NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED",  "MAY", and
"OPTIONAL" in this document are to be interpreted as described in
RFC 2119.

We define the following concepts:

* __Node__ - a system that is capable of receiving and sending Messages
* __Message__ - a chunk of data sent from a Sending Node to a Receiving Node
* __Sending Node__ - a Node that sends a particular Message
* __Receiving Node__ - a Node that receives a particular Message
* __Link__ - a channel for bilateral communication between two Nodes
* __Communication Network__ - the combination of a set of Nodes with a set of Links between them.
* __Balance Graph__ - a weighted, directed graph consisting of the same Nodes and Links as the Communication Network, but adding directedness and weight to the Links.
* __Probe__ - a series of Node-to-Node Messages, in an attempt to detect one loop in the Balance Graph.
* __Probe Message__ - one of the Messages of a Probe.
* __Probe ID__ - hard-to-guess number included in a Probe Message.
* __Scout Message__ - a Message used to confirm the existence of a loop and to find its smallest weight.
* __Scout ID__ - hard-to-guess number included in a Scout Message, along with Probe ID and Weight.
* __Apex Node__ - the Node at which a Probe loops back onto itself.

# Loop Detection

The Decentralized Loop Removal (DLR) algorithm is essentially a depth-first search in which a path through the Balance Graph is constructed until a repeating Node is found.

* At any time, any Node in the network may start a Probe by sending a Probe Message including a Probe ID to a Receiving Node, following a Balance Graph Link.
* When receiving a Probe Message, if the Receiving Node hasn't seen its Probe ID before, it may send a related Probe Message to another Node following an outgoing Balance Graph Link, thus advancing the depth-first search for a loop.
* If the Receiving Node doesn't have any outgoing Links, it can send a Nack Message including the Probe ID back to the Sending Node, to indicate that the depth-first search should backtrack.
* If it has seen the Probe ID, that means the Probe has looped back on itself. This means this Node is the Apex Node for this Probe.
* When a Nack Message is received, the Node may send a Probe Message over the next outgoing link, or if none are available, send its own Nack Message back towards the Node where the Probe was initiated.
* If the initiating node receives a Nack Message with the Probe ID of the Probe that started there, then the search for a loop was unsuccessful.

# Loop Removal

The goal of this algorithm is to adjust the Weights of Links along the Balance Graph loop, such that the sum of outgoing weights minus the sum of incoming weights stays equal.
An Apex Node can send a Scout Message to the Node that sent the second Probe Message, including:

* the Probe ID,
* a new pseudorandomly generated Scout ID, and
* a Weight, set to the Weight of the Link over which it travels (note that a Scout Message travels against the direction of the Balance Graph).

A Node that receives a Scout Message in response to a Probe Message, but that is not itself the Apex Node for that Probe, should forward it along the loop, reducing the Weight value to the Weight of the Link it's travelling over if that is lower than the Weight value that came in.

When the Apex Node receives the Scout Message, it has obtained  proof that the loop exists, all Nodes along the loop know that the adjacent part of the loop's trajectory, and if all Node have truthfully set the Weight value, then the loop can be removed by reducing all Balance Graph Link Weights by the Weight of the final Scout Message.

To do this, the Apex Node generates a Secret, and includes its SHA256 hash in a Propose Message, alongside the Probe ID and the Weight of the Scout Message.
This Propose Message is forwarded along the loop until it reaches the Apex Node.

When it does, the Apex Node responds with a Commit Message, including the Probe ID, Weight, and Secret.

Each Node along the loop can then check that the Challenge from the Propose Message equals the SHA256 hash of the Secret from the Commit Message.

# Example

Consider the following graph:

```
A -3-> B <-3- E -2-> F
       |      ^
       2      |
       |      8
       v      |
       C -5-> D
```
The following messages might be sent (here using an arbitrary space-delimited serialisation):

* A -> B  "type=probe probeID=rei6Ac8i"
* B -> C  "type=probe probeID=rei6Ac8i"
* C -> D  "type=probe probeID=rei6Ac8i"
* D -> E  "type=probe probeID=rei6Ac8i"
* E -> F  "type=probe probeID=rei6Ac8i"
* F -> E  "type=nack probeID=rei6Ac8i"
* E -> B  "type=probe probeID=rei6Ac8i"
* B -> E  "type=scout probeID=rei6Ac8i scoutID=aeBoi8xu weight=3"
* E -> D  "type=scout probeID=rei6Ac8i scoutID=aeBoi8xu weight=3"
* D -> C  "type=scout probeID=rei6Ac8i scoutID=aeBoi8xu weight=3"
* C -> B  "type=scout probeID=rei6Ac8i scoutID=aeBoi8xu weight=2"
* B -> C  "type=propose probeID=rei6Ac8i challenge=16e89343fd298cdf28a8619ceb9477bbeee7a42c10ccaf27062a5d8d6469ed55 weight=2"
* C -> D  "type=propose probeID=rei6Ac8i challenge=16e89343fd298cdf28a8619ceb9477bbeee7a42c10ccaf27062a5d8d6469ed55 weight=2"
* D -> E  "type=propose probeID=rei6Ac8i challenge=16e89343fd298cdf28a8619ceb9477bbeee7a42c10ccaf27062a5d8d6469ed55 weight=2"
* E -> B  "type=propose probeID=rei6Ac8i challenge=16e89343fd298cdf28a8619ceb9477bbeee7a42c10ccaf27062a5d8d6469ed55 weight=2"
* B -> E  "type=commit probeID=rei6Ac8i solution=Ohkae6lu weight=2"
* E -> D  "type=commit probeID=rei6Ac8i solution=Ohkae6lu weight=2"
* D -> C  "type=commit probeID=rei6Ac8i solution=Ohkae6lu weight=2"
* C -> B  "type=commit probeID=rei6Ac8i solution=Ohkae6lu weight=2"

# Security Considerations
The Apex Node cannot conclude that a communication loop has been found based just on the repeated occurrance of the Probe ID, because it has no knowledge of how the Probe ID was generated.
It can however conclude that a communication loop exists if the Scout ID is looped back to it intact.
A malicious or malfunctioning node could fail to forward messages, thus preventing the completion of the algorithm.
A malicious or malfunctioning node could collude with another node along the path to send fake Scout and Propose messages along a Probe path, thus convincing the intermediate nodes to reserve
some weight inexpectation of a commit message, and preventing those nodes from participating in other
--- back
