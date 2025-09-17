# Documentation Organization Summary

Documentation has been organized into `/docs/` directory for better project structure.

## What was moved

- `PATCHRIGHT_AUTOMATION.md` → `docs/PATCHRIGHT_AUTOMATION.md`
- `CI-CD-AUTOMATION-SUMMARY.md` → `docs/CI-CD-AUTOMATION-SUMMARY.md`

## What was created

- `docs/README.md` - Index and overview of all documentation

## What was updated

- Main `README.md` - Added documentation section pointing to the `/docs/` directory

## Clean root directory

Project root now contains only essential files:

- `README.md` (main project readme)
- `HA-MQTT.md` (Home Assistant integration guide)
- `package.json`, `Dockerfile`, etc. (core project files)
- `docs/` directory (technical documentation)

## Benefits

- Cleaner project root with less clutter
- Organized documentation in logical location
- Clear hierarchy: Main README → docs directory → specific guides
- Easy to find and update technical documentation

The main project root is now clean while all automation documentation is easily accessible in `/docs/`.
