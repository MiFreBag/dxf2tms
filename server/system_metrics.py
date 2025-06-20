# system_metrics.py - System Monitoring Backend
import psutil
import docker
import shutil
import platform
import time
import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)

class SystemMetricsCollector:
    """Sammelt Systemmetriken für Host-Monitoring"""
    
    def __init__(self):
        self.docker_client = None
        try:
            self.docker_client = docker.from_env()
        except Exception as e:
            logger.warning(f"Docker client not available: {e}")
    
    def get_cpu_metrics(self) -> Dict[str, Any]:
        """CPU-Metriken sammeln"""
        try:
            # CPU-Auslastung (Durchschnitt über 1 Sekunde)
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Anzahl der CPU-Kerne
            cpu_count = psutil.cpu_count()
            
            # Load Average (nur Unix-Systeme)
            load_avg = [0.0, 0.0, 0.0]
            if hasattr(os, 'getloadavg'):
                try:
                    load_avg = list(os.getloadavg())
                except OSError:
                    pass
            
            # CPU-Frequenz
            cpu_freq = psutil.cpu_freq()
            current_freq = cpu_freq.current if cpu_freq else 0
            
            return {
                "usage": cpu_percent,
                "cores": cpu_count,
                "loadAverage": load_avg,
                "frequency": {
                    "current": current_freq,
                    "min": cpu_freq.min if cpu_freq else 0,
                    "max": cpu_freq.max if cpu_freq else 0
                }
            }
        except Exception as e:
            logger.error(f"Error collecting CPU metrics: {e}")
            return {
                "usage": 0,
                "cores": 0,
                "loadAverage": [0, 0, 0],
                "frequency": {"current": 0, "min": 0, "max": 0}
            }
    
    def get_memory_metrics(self) -> Dict[str, Any]:
        """Speicher-Metriken sammeln"""
        try:
            # Virtueller Speicher
            virtual_mem = psutil.virtual_memory()
            
            # Swap-Speicher
            swap_mem = psutil.swap_memory()
            
            # Konvertierung zu GB
            total_gb = virtual_mem.total / (1024**3)
            used_gb = virtual_mem.used / (1024**3)
            available_gb = virtual_mem.available / (1024**3)
            
            return {
                "total": total_gb,
                "used": used_gb,
                "available": available_gb,
                "percentage": virtual_mem.percent,
                "swap": {
                    "total": swap_mem.total / (1024**3),
                    "used": swap_mem.used / (1024**3),
                    "percentage": swap_mem.percent
                },
                "buffers": getattr(virtual_mem, 'buffers', 0) / (1024**3),
                "cached": getattr(virtual_mem, 'cached', 0) / (1024**3)
            }
        except Exception as e:
            logger.error(f"Error collecting memory metrics: {e}")
            return {
                "total": 0, "used": 0, "available": 0, "percentage": 0,
                "swap": {"total": 0, "used": 0, "percentage": 0},
                "buffers": 0, "cached": 0
            }
    
    def get_disk_metrics(self) -> Dict[str, Any]:
        """Festplatten-Metriken sammeln"""
        try:
            # Root-Verzeichnis Speicherplatz
            disk_usage = shutil.disk_usage('/')
            
            total_gb = disk_usage.total / (1024**3)
            used_gb = (disk_usage.total - disk_usage.free) / (1024**3)
            free_gb = disk_usage.free / (1024**3)
            percentage = (used_gb / total_gb) * 100 if total_gb > 0 else 0
            
            # Disk I/O Statistiken
            disk_io = psutil.disk_io_counters()
            
            # Alle Mountpoints sammeln
            partitions = []
            for partition in psutil.disk_partitions():
                try:
                    partition_usage = shutil.disk_usage(partition.mountpoint)
                    partitions.append({
                        "device": partition.device,
                        "mountpoint": partition.mountpoint,
                        "fstype": partition.fstype,
                        "total": partition_usage.total / (1024**3),
                        "used": (partition_usage.total - partition_usage.free) / (1024**3),
                        "free": partition_usage.free / (1024**3),
                        "percentage": ((partition_usage.total - partition_usage.free) / partition_usage.total) * 100 if partition_usage.total > 0 else 0
                    })
                except PermissionError:
                    continue
            
            return {
                "total": total_gb,
                "used": used_gb,
                "free": free_gb,
                "percentage": percentage,
                "io": {
                    "read_bytes": disk_io.read_bytes if disk_io else 0,
                    "write_bytes": disk_io.write_bytes if disk_io else 0,
                    "read_count": disk_io.read_count if disk_io else 0,
                    "write_count": disk_io.write_count if disk_io else 0
                },
                "partitions": partitions
            }
        except Exception as e:
            logger.error(f"Error collecting disk metrics: {e}")
            return {
                "total": 0, "used": 0, "free": 0, "percentage": 0,
                "io": {"read_bytes": 0, "write_bytes": 0, "read_count": 0, "write_count": 0},
                "partitions": []
            }
    
    def get_network_metrics(self) -> Dict[str, Any]:
        """Netzwerk-Metriken sammeln"""
        try:
            # Netzwerk I/O Statistiken
            net_io = psutil.net_io_counters()
            
            # Netzwerk-Interfaces
            interfaces = {}
            for interface, stats in psutil.net_io_counters(pernic=True).items():
                interfaces[interface] = {
                    "bytes_sent": stats.bytes_sent,
                    "bytes_received": stats.bytes_recv,
                    "packets_sent": stats.packets_sent,
                    "packets_received": stats.packets_recv,
                    "errors_in": stats.errin,
                    "errors_out": stats.errout,
                    "dropped_in": stats.dropin,
                    "dropped_out": stats.dropout
                }
            
            # Aktive Verbindungen
            connections = len(psutil.net_connections())
            
            return {
                "bytesReceived": net_io.bytes_recv if net_io else 0,
                "bytesSent": net_io.bytes_sent if net_io else 0,
                "packetsReceived": net_io.packets_recv if net_io else 0,
                "packetsSent": net_io.packets_sent if net_io else 0,
                "errorsIn": net_io.errin if net_io else 0,
                "errorsOut": net_io.errout if net_io else 0,
                "droppedIn": net_io.dropin if net_io else 0,
                "droppedOut": net_io.dropout if net_io else 0,
                "interfaces": interfaces,
                "connections": connections
            }
        except Exception as e:
            logger.error(f"Error collecting network metrics: {e}")
            return {
                "bytesReceived": 0, "bytesSent": 0, "packetsReceived": 0, "packetsSent": 0,
                "errorsIn": 0, "errorsOut": 0, "droppedIn": 0, "droppedOut": 0,
                "interfaces": {}, "connections": 0
            }
    
    def get_system_info(self) -> Dict[str, Any]:
        """System-Informationen sammeln"""
        try:
            # Boot-Zeit
            boot_time = psutil.boot_time()
            uptime = time.time() - boot_time
            
            # Docker-Version
            docker_version = "N/A"
            if self.docker_client:
                try:
                    docker_version = self.docker_client.version()['Version']
                except Exception:
                    pass
            
            # System-Informationen
            uname = platform.uname()
            
            return {
                "uptime": uptime,
                "bootTime": datetime.fromtimestamp(boot_time, tz=timezone.utc).isoformat(),
                "dockerVersion": docker_version,
                "hostname": uname.node,
                "system": uname.system,
                "release": uname.release,
                "version": uname.version,
                "machine": uname.machine,
                "processor": uname.processor or platform.processor(),
                "architecture": platform.architecture()[0],
                "pythonVersion": platform.python_version()
            }
        except Exception as e:
            logger.error(f"Error collecting system info: {e}")
            return {
                "uptime": 0, "bootTime": "", "dockerVersion": "N/A",
                "hostname": "", "system": "", "release": "", "version": "",
                "machine": "", "processor": "", "architecture": "", "pythonVersion": ""
            }
    
    def get_docker_metrics(self) -> Dict[str, Any]:
        """Docker-spezifische Metriken sammeln"""
        if not self.docker_client:
            return {"containers": 0, "images": 0, "volumes": 0, "networks": 0}
        
        try:
            # Container-Statistiken
            all_containers = self.docker_client.containers.list(all=True)
            running_containers = self.docker_client.containers.list()
            
            # Images
            images = self.docker_client.images.list()
            
            # Volumes
            volumes = self.docker_client.volumes.list()
            
            # Networks
            networks = self.docker_client.networks.list()
            
            # Container-Status aufschlüsseln
            container_stats = {"running": 0, "stopped": 0, "paused": 0, "restarting": 0, "other": 0}
            for container in all_containers:
                status = container.status.lower()
                if status == "running":
                    container_stats["running"] += 1
                elif status in ["exited", "stopped"]:
                    container_stats["stopped"] += 1
                elif status == "paused":
                    container_stats["paused"] += 1
                elif status == "restarting":
                    container_stats["restarting"] += 1
                else:
                    container_stats["other"] += 1
            
            return {
                "containers": {
                    "total": len(all_containers),
                    "running": container_stats["running"],
                    "stopped": container_stats["stopped"],
                    "paused": container_stats["paused"],
                    "restarting": container_stats["restarting"],
                    "other": container_stats["other"]
                },
                "images": len(images),
                "volumes": len(volumes),
                "networks": len(networks)
            }
        except Exception as e:
            logger.error(f"Error collecting Docker metrics: {e}")
            return {"containers": {"total": 0, "running": 0, "stopped": 0, "paused": 0, "restarting": 0, "other": 0}, "images": 0, "volumes": 0, "networks": 0}
    
    def get_process_metrics(self) -> Dict[str, Any]:
        """Prozess-Metriken sammeln"""
        try:
            # Anzahl der Prozesse
            process_count = len(psutil.pids())
            
            # Top Prozesse nach CPU-Nutzung
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'memory_info']):
                try:
                    proc_info = proc.info
                    if proc_info['cpu_percent'] > 0:  # Nur aktive Prozesse
                        processes.append({
                            "pid": proc_info['pid'],
                            "name": proc_info['name'],
                            "cpu_percent": proc_info['cpu_percent'],
                            "memory_percent": proc_info['memory_percent'],
                            "memory_mb": proc_info['memory_info'].rss / (1024*1024) if proc_info['memory_info'] else 0
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass
            
            # Top 10 CPU-Verbraucher
            top_cpu = sorted(processes, key=lambda x: x['cpu_percent'], reverse=True)[:10]
            
            # Top 10 Memory-Verbraucher
            top_memory = sorted(processes, key=lambda x: x['memory_percent'], reverse=True)[:10]
            
            return {
                "total": process_count,
                "topCpu": top_cpu,
                "topMemory": top_memory
            }
        except Exception as e:
            logger.error(f"Error collecting process metrics: {e}")
            return {"total": 0, "topCpu": [], "topMemory": []}
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """Alle Metriken sammeln"""
        try:
            return {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cpu": self.get_cpu_metrics(),
                "memory": self.get_memory_metrics(),
                "disk": self.get_disk_metrics(),
                "network": self.get_network_metrics(),
                "system": self.get_system_info(),
                "docker": self.get_docker_metrics(),
                "processes": self.get_process_metrics()
            }
        except Exception as e:
            logger.error(f"Error collecting all metrics: {e}")
            return {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(e)
            }

# Singleton instance
metrics_collector = SystemMetricsCollector()

# FastAPI endpoint functions
def get_system_metrics():
    """FastAPI endpoint für Systemmetriken"""
    return metrics_collector.get_all_metrics()

def get_cpu_metrics():
    """FastAPI endpoint für CPU-Metriken"""
    return metrics_collector.get_cpu_metrics()

def get_memory_metrics():
    """FastAPI endpoint für Memory-Metriken"""
    return metrics_collector.get_memory_metrics()

def get_disk_metrics():
    """FastAPI endpoint für Disk-Metriken"""
    return metrics_collector.get_disk_metrics()

def get_network_metrics():
    """FastAPI endpoint für Network-Metriken"""
    return metrics_collector.get_network_metrics()