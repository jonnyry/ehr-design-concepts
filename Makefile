.PHONY: install serve

install:
	dotnet tool install --global dotnet-serve

serve:
	dotnet serve --port 5000 --directory .
