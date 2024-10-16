---
title: 'Decentralized Cycle Detection'
docname: draft-dejong-decentralized-cycle-detection-00
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

Decentralized Cycle Detection is node-to-node messaging protocol for finding
cycles in networks.
It differs from some other cycle finding algorithms in that it does not require
a central coordinator or a bird's-eye view of the network.
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
* __Neighbour__ - (of a Node), another Node such that a Link exists between the two Nodes.
* __Network__ - the combination of a set of Nodes with a set of Links between them.
* __Path__ - a sequence of Nodes such that a Link exists between each Node and the next one.
* __Cycle__ - a Path such that a Link also exists between its last and its first Node.
* __Probe__ - a number of Node-to-Node Messages, in an attempt to detect one cycle.
* __Probe Message__ - one of the Messages of a Probe.
* __Nack Message__ - a Message sent in response to a Probe Message, indicating a lack of outgoing Links further ahead.
* __Probe ID__ - hard-to-guess number included in a Probe Message.
* __Trace__ - a number of Node-to-Node Messages, in an attempt to confirm the existence of a cycle, suggested by a Probe.
* __Trace Message__ - one of the Messages of a Trace.
* __Trace ID__ - a second hard-to-guess number, included in each Trace Message of a particular Trace.
* __Apex Node__ - the Node at which a Probe loops back onto itself.
* __Incarnation__ - a round of Probe reuse.

# Introduction
There are several situation in which Nodes in a Network could cooperate to find Cycles. Decentralized Cycle Detection is node-to-node messaging protocol that can help them do that.

# Initiating a Probe

At any time, any Node in the Network which has at least one Neighbour MAY autonomously decide to start a new Probe. It does so by generating a Probe ID, and sending that to one of its Neighbours in a Probe Message.

# Forwarding a Probe
At any time after Node B receives a Probe Message from Node A, containing some Probe ID, if Node B had not previously received any Probe Message containing that same Probe ID, and Node B has at least one other Neighbour, Node B SHOULD forward the Probe, by sending an identical Probe Message (containing the same Probe ID as the Probe Message received from Node A) to a different one of its Neigbours, Node C.

If Node B does not have any Neighbours other than Node A, then it SHOULD send back a Nack Message containing the Probe ID from Node A's Probe Message.

If Node B receives a Nack Message (with matching Probe ID) from Node C in response to a Probe Message, then Node B SHOULD send the Probe to one of its remaining Neighbours, with which the Probe ID in the Nack Message was neither exchanged in a receiving role nor in a sending role yet. If no such Neighbours are left, Node B SHOULD send a Nack Message to the Node from which the Probe was originally received.

If a Nack Message is received by the Node that initiated the Probe, it SHOULD likewise send it to a remaining Neighbours to which the Probe ID in the Nack Message was never sent yet, and if no such Neighbours remain, stop.

At all times, each Node SHOULD keep a record of Neighbours from which a given Probe was received, to whom it was forwarded, and whether or not that forwarding was responded to with a corresponding Nack Message.

If Node B has seen a Probe Message with the same Probe ID before, then Node B is an Apex Node for this Probe. It can now initiate a different mechanism to confirm the existence of a Cycle and, for instance, initiate its removal if that is desired.

# Mitigating Unexpected Behaviour
In the previous sections, the actions each Node SHOULD take describe a depth-first search with backtracking. If all Nodes collaborate, and a Cycle is reachable from the Node that initiates the Probe, then more and more Nodes will receive the Probe, until the Cycle will eventually be found.

But Links and Nodes MAY behave differently, leading to Messages not being sent intact, or being sent in a different direction or at a different time.

If a Message is malformed, it SHOULD be discarded.

If a Probe Message is repeated or sent back to the Neighbour it came from, these extra Messages SHOULD be discarded.
If a Nack Message is received in any situation other than in response to a Probe Message with matching Probe ID, it SHOULD be discarded.

If the Probe ID in a Probe Message is changed, then this SHOULD be interpreted as the Probe being stopped prematurely, and a new Probe being initiated at the Node that first sends a Probe Message with the changed Probe ID.

If two Probes have the same Probe ID, this may cause a Node which receives both those Probes to act as if it is the Apex Node for one of them. The Trace algorithm (see next section) is designed to be robust against this possibility.

If a Node sends back a Nack Message in response to a Probe Message, yet a Probe Message for the same Probe ID is also sent to another Neighbour, this will result in forking the Probe into strands that travel through the Network in parallel.
Likewise, a Node MAY forward a Probe to more than one other Neighbour at the same time, which would essentially correspond to a breadth-first search instead of a depth-first search.
This is a second possibility that the Trace algorithm needs to be robust against.

# Traces

A Trace attempts to confirm the existence of a Cycle as suggested by a Probe. It is initiated by an Apex Node, and is sent to only one of the Neighbours from which the Apex Node has previously received Probe Messages with the Probe ID, using a pseudorandomly generated Trace ID. The Apex Node MAY initiate several such Traces at once, up to one for each Neighbours from which the Apex Node has previously received Probe Messages for the Probe in question.

In the previous section, we identified two possibilities which the Trace algorithm needs to be robust against: Probe IDs may be repeated between Probes, and Probes may fork into parallel 
strands of search activity through the Network. Trace Messages achieve this as follows.

Since the Trace ID is generated by the Apex Node, if that Trace ID arrives back at the Apex Node in any way, other than from the Neighbour it was sent to, then the Apex Node can be sure that a Cycle of Links exists in the Network.

When receiving a Trace Message, a Node SHOULD forward it to all its other Neighbours with which it has previously exchanged a Probe Message for the Probe ID that is included in the Trace Message, except for Neighbours from which a (valid) Nack Message was received for this Probe. The Probe ID and Trace ID SHOULD be copied unchanged from the incoming to these outgoing Trace Messages.

When a Trace arrives back at the Apex Node via a different Neighbour than the Neighbour to which it was sent, the Apex Node has proof of the existence of a Cycle in the Network.

The Apex Node can now send a different message type (out of scope for this specification) in response to the incoming Trace Message, referencing its Trace ID.

Each Node on the Cycle can relay this message back to where the Trace Message came from, until it reaches the Apex Node again.

# Serialisation

This protocol specification does not prescribe any particular serialisation of Probe, Nack and Trace Messages. They may be serialised onto each bilateral Link in any way the Sending and Receiving Node see fit to agree on.

For instance, it could be serialised into an ASCII string which itself contains as a space-delimited series of strings, the first one being for instance 'probe' for a Probe Message, 'nack' for Nack Message or 'trace' for Trace Message, and the second one being for instance an alphanumerical ASCII representation the Probe ID. In the case of a Trace Message, these could be followed by an alphanumerical ASCII representations of the Trace ID.

Other options include JSON, XML, etcetera, and these serialisations MAY be sent directly as TCP messages over IP, or be wrapped into other messaging protocols such as for instance HTTP POST over HTTP/2. When forwarding a Probe, Nack or Trace Message, a Node would have to take care of the appropriate translations.

# Example

Consider the following graph:

```
A - B - E - F
    |   |
    C - D
```
The following messages might be sent (here using the arbitrary space-delimited serialisation described in the previous section).

Probe:

* A -> B -> C -> D -> E -> F "probe rei6Ac8i"
* F -> E  "nack rei6Ac8i"
* E -> B  "probe rei6Ac8i"

Trace to A:

* B -> A  "trace rei6Ac8i aeBoi8xu"

Trace to E:

* B -> E -> F "trace rei6Ac8i Yoof1ae"
* E -> D -> C -> B  "trace rei6Ac8i Yoof1ae"

Trace to C:

* B -> C -> D -> E -> F "trace rei6Ac8i IC5eiph"
* E -> B  "trace rei6Ac8i IC5eiph"

# Security Considerations

Malicious or malfunctioning Nodes can stop the algorithm from successfully finding Cycles (see also the 'Mitigating Unexpected Behaviour' section above), but as far as we know they cannot cause any false-positive cycle detection.

# IANA Considerations
This internet draft does not introduce any identifiers for consideration by IANA.

# Appendix A: Optimisations

This appendix specifies a number of optional optimisations.

## Incarnations

As an optimisation of this algorithm, an additional natural number can be added to each Probe Message as its Incarnation. When a Probe is first initiated, this Incarnation number SHOULD be set to zero. After a Cycle is detected and removed, the remnants of a Probe MAY be reused in a next Incarnation. If the Cycles is removed by removing only one Link, then the Node just before that Link can be used as the starting point for a new Incarnation of the Probe, by sending a new Probe Message to a remaining Neighbour, containing an incremented Incarnation.

The mechanism for detecting whether a Node is an Apex Node then needs to be augmented with a check - 

## Trace Legs

Another optimisation to make Traces more efficient, which is especially relevant when Nack Messages are not used, is to make the Traces for a particular Probe cooperate, but assigning them all the same Trace ID, but a different Leg ID. Traces then only need to be forwarded to the Neighbour from which the Probe was received, unless two Legs of one Trace are received, in which case the second Trace Leg SHOULD be forwarded to the Neighbour from which the first Trace Leg of that Trace was received.

## Handraising Protocol

In Networks where Probes are allowed to fork, two Nodes can get into the situation where they send each other an identical Probe Message at the same time, making it impossible for each of them to conclude that the other Node forwarded the Probe to them from elsewhere, rather than just echoing it back directly. To avoid this, Nodes can agree on a Handraising Protocol to govern the Link between them. When Node A wants to send a Probe Message to Node B, but minimise the chance that Node B sents is an identical Probe Message at the same time, Node A first sends a 'raise hand' Message, and waits for Node B to respond with an 'OK to send' Message before sending the actual Probe Message. In the meantime, when Node B sends its 'OK to send' Message, it will temporarily pause its own Probe Message sending. The same mechanism would then be used in the opposite direction when Node B has a Probe Message to send to Node A.
--- back
