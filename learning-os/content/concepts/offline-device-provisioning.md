---
id: offline-device-provisioning
title: Provisioning and updating an offline device
parent: Edge systems
order: 60
status: not_started
review: false
prereqs:
  - one-way-observability
notes: []
updated: '2026-09-21'
---
# Provisioning and updating an offline device

## Why it exists
A device with no network path in is a device you cannot apt-get, cannot
remote-shell into, and cannot recover if an update fails. Every ordinary
assumption about operating a Linux box is void. This is the operational cost
of the architecture and, like the observability problem, it is the thing that
tempts people into drilling a hole through their own air gap. Plan it before
you need it.

## Reproducible images over in-place maintenance
Treat the HIGH device as immutable infrastructure: build a complete, versioned
image from a declarative definition (a scripted rpi-image-gen/pi-gen build, or
a Yocto/Buildroot image, or at minimum a documented script plus pinned
dependency lockfile), flash it, and never hand-modify the running system. The
payoff is that the question "what is running over there" has an answer you can
compute - the image hash - instead of one you would have to log in to
discover. Emit that hash in the telemetry record so the LOW side can report it.

A subtlety specific to offline builds: dependency resolution happens on the
BUILD machine, so you must vendor everything the target needs - model
weights, wheels, apt packages - into the image. The first offline boot that
tries to pip-install is the point you discover what you forgot.

## A/B images and safe rollback
The failure you must survive is "the new image does not boot and you cannot
SSH in". The standard answer is two system partitions: flash the inactive
one, mark it to-try, boot it, and have a watchdog mark it good only after the
application reaches a healthy state. If it does not, the bootloader falls
back to the previous known-good slot automatically. This is the single
highest-value piece of engineering for a device you cannot reach, and it is
what makes updating it a routine act rather than a risk.

## Sneakernet discipline
Updates arrive on removable media, which is itself an attack path - the media
has touched a networked machine. Sign images and verify signatures on the
device before applying; use dedicated media that never goes anywhere else;
and keep a written, dated record of what was flashed when, since there is no
remote inventory to query.

## Secrets and time
Two things offline devices get wrong. Secrets: the HIGH side should need
almost none, since it connects to nothing - if you find yourself provisioning
credentials onto it, ask what they are for and whether that is a hole.
Time: with no network there is no NTP, and the clock will drift; on boards
with no battery-backed RTC it resets entirely. Since every record you emit is
timestamped and the receiver reasons about ordering and staleness, fit a real
RTC module, and additionally include an uptime/monotonic counter in records
so the receiver can detect a clock jump rather than silently trusting it.

## Self-test
- Can you rebuild the exact running image from source, today? Prove it.
- What happens, concretely, if the next image fails to boot?
- Where does the HIGH device get its time, and how would you notice a jump?
