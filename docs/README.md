# OnStar2MQTT Documentation

This directory contains documentation for OnStar2MQTT's development history and technical details.

## Files

### [ONSTARJS_2.16.0_INTEGRATION.md](./ONSTARJS_2.16.0_INTEGRATION.md)

**Integration summary** for OnStarJS 2.16.0 new commands and upstream caveats.

- **New commands**: `getWarrantyInfo()` and `getSxmSubscriptionInfo()`
- **Upstream caveats**: `getOnstarPlan` field name fixes, partial error tolerance, new fields
- **Test coverage**: 22 new tests, 457 total passing
- **MQTT buttons**: Auto-discovered in Home Assistant

**Audience**: Developers, maintainers, users upgrading to OnStarJS 2.16.0

### [ONSTARJS_2.12.0_INTEGRATION.md](./ONSTARJS_2.12.0_INTEGRATION.md)

**Integration summary** for OnStarJS 2.12.0+ new commands.

- **New commands**: 9 new commands, 4 deprecated
- **MQTT buttons**: Auto-discovered in Home Assistant
- **Recall sensor**: Automatic recall monitoring
- **Vehicle image**: Manufacturer photo entity

**Audience**: Developers, maintainers

### [PATCHRIGHT_AUTOMATION.md](./PATCHRIGHT_AUTOMATION.md)

**Technical documentation** for the patchright version management system.

- **Problem explanation**: Why patchright versions matter for Docker builds
- **Implementation details**: How npm overrides solve the problem
- **Maintenance automation**: Renovate integration for updates
- **Manual commands**: For troubleshooting and development
- **Verification steps**: How to test the setup

**Audience**: Developers, maintainers, technical contributors

### [CI-CD-AUTOMATION-SUMMARY.md](./CI-CD-AUTOMATION-SUMMARY.md)

**Quick reference guide** for the patchright management system.

- **Summary**: What's automated and how
- **Benefits**: Why this approach works
- **Commands**: Manual sync when needed
- **Testing**: How to verify everything works

**Audience**: End users, quick reference

## Quick Start

For most users:

1. **Docker builds work automatically** - npm override handles compatibility
2. **Renovate manages updates** - syncs when onstarjs2 changes
3. **Manual sync available**: `npm run sync-patchright` (rarely needed)

## For Developers

See [PATCHRIGHT_AUTOMATION.md](./PATCHRIGHT_AUTOMATION.md) for:

- Complete technical details
- How the automation works
- Troubleshooting information
- How to modify the system
