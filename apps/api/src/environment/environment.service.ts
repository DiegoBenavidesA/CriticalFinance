import { Injectable, OnModuleInit } from "@nestjs/common";
import { EnvironmentVariables } from "./environment.schema";
import { loadEnvironmentVariables } from "./environment.loader";

@Injectable()
export class EnvironmentService implements OnModuleInit {
  private variables: EnvironmentVariables;

  onModuleInit() {
    this.load();
  }

  load(): void {
    this.variables = loadEnvironmentVariables();
  }

  get<K extends keyof EnvironmentVariables>(key: K): EnvironmentVariables[K] {
    return this.variables[key];
  }
}

